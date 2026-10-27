import { FunctionalError } from '@Voikyrioh/observability'
import { expect } from 'chai'
import { reading, testWorld } from '../../../__tests__/support/fakes'
import { ScrapeFailure } from '../../ports/scraper'

const LDLC = 'https://www.ldlc.com/fiche/PB1.html'

describe('us-ajouter-par-lien (AddProductFromUrl)', () => {
	it('should create a product from a known shop link, then reuse it', async () => {
		const { uc, scraper } = testWorld()
		scraper.pages.set(LDLC, reading(LDLC))
		const created = await uc.addFromUrl.Execute(`${LDLC}?utm_source=mail#avis`)
		expect(created.created).to.equal(true)
		const again = await uc.addFromUrl.Execute(LDLC)
		expect(again).to.deep.equal({ productId: created.productId, created: false })
		expect(scraper.readCalls).to.have.length(1)
		// BR-SCRAPE-001: a pasted link is the person's own request.
		expect(scraper.readTriggers).to.deep.equal(['user'])
		const view = await uc.getProduct.Execute(created.productId, null)
		expect(view.offers[0]).to.include({ shopId: 'ldlc', shopName: 'LDLC', priceCents: 59995 })
	})

	it('should name an unlisted shop by its domain (BR-SHOP-002)', async () => {
		const { uc, scraper } = testWorld()
		const url = 'https://www.boutique-pc.fr/p/123'
		scraper.pages.set(url, reading(url))
		const { productId } = await uc.addFromUrl.Execute(url)
		const view = await uc.getProduct.Execute(productId, null)
		expect(view.offers[0]).to.include({ shopId: 'boutique-pc.fr', shopName: 'boutique-pc.fr' })
	})

	const failures: [string, ScrapeFailure | null, string, string][] = [
		['pas-un-lien', null, 'invalid-payload', 'url-format'],
		['https://exemple.fr:8443/p', null, 'invalid-payload', 'url-forbidden'],
		[
			'https://a.fr/1',
			new ScrapeFailure('forbidden-address', 'x'),
			'invalid-payload',
			'url-forbidden',
		],
		['https://a.fr/2', new ScrapeFailure('no-product', 'x'), 'invalid-payload', 'no-product'],
		['https://a.fr/3', new ScrapeFailure('robots', 'x'), 'forbidden', 'robots'],
		['https://a.fr/4', new ScrapeFailure('blocked', 'x'), 'service-unavailable', 'blocked'],
		['https://a.fr/5', new ScrapeFailure('timeout', 'x'), 'service-unavailable', 'unreachable'],
	]
	for (const [url, failure, code, reason] of failures) {
		it(`should answer ${code}/${reason} for ${url}`, async () => {
			const { uc, scraper } = testWorld()
			if (failure) scraper.pages.set(url, failure)
			const error = (await uc.addFromUrl.Execute(url).catch((e: unknown) => e)) as FunctionalError
			expect(error).to.be.instanceOf(FunctionalError)
			expect([error.code, error.reason]).to.deep.equal([code, reason])
		})
	}
})

describe('us-consulter-un-produit (GetProduct / RefreshProduct)', () => {
	async function productWithTwoShops() {
		const world = testWorld()
		const top = 'https://www.topachat.com/produit/9.html'
		world.scraper.pages.set(LDLC, reading(LDLC, { gtin: '4711377157834' }))
		world.scraper.pages.set(
			top,
			reading(top, { gtin: '4711377157834', priceCents: 57995, stock: 'out_of_stock' }),
		)
		const { productId } = await world.uc.addFromUrl.Execute(LDLC)
		await world.uc.addFromUrl.Execute(top)
		return { ...world, productId, top }
	}

	it('should list offers with the best available one (BR-OFFER-005)', async () => {
		const { uc, productId } = await productWithTwoShops()
		const view = await uc.getProduct.Execute(productId, null)
		expect(view.offers.map((o) => o.shopId)).to.deep.equal(['ldlc', 'topachat'])
		expect(view.bestOffer?.shopId).to.equal('ldlc')
		expect(view.refreshing).to.equal(false)
	})

	it('should refresh in the background after 30 minutes (BR-OFFER-002)', async () => {
		const { uc, productId, clock, scraper } = await productWithTwoShops()
		clock.advance(31 * 60_000)
		scraper.pages.set(LDLC, reading(LDLC, { priceCents: 54995 }))
		const view = await uc.getProduct.Execute(productId, null)
		expect(view.refreshing).to.equal(true)
		await uc.refresher.refresh(productId, 'user')
		const after = await uc.getProduct.Execute(productId, null)
		expect(after.bestOffer?.priceCents).to.equal(54995)
	})

	it('should refuse a manual refresh within 2 minutes (BR-OFFER-003)', async () => {
		const { uc, productId, clock } = await productWithTwoShops()
		const error = (await uc.refreshProduct
			.Execute(productId, null)
			.catch((e: unknown) => e)) as FunctionalError
		expect([error.code, error.reason]).to.deep.equal(['rate-limited', 'refresh-too-soon'])
		clock.advance(2 * 60_000)
		const view = await uc.refreshProduct.Execute(productId, null)
		expect(view.offers).to.have.length(2)
	})

	it('should keep the last known state when a reading fails (BR-OFFER-004)', async () => {
		const { uc, productId, clock, scraper, top } = await productWithTwoShops()
		clock.advance(3 * 60_000)
		scraper.pages.set(top, new ScrapeFailure('unreachable', 'down'))
		const view = await uc.refreshProduct.Execute(productId, null)
		const offer = view.offers.find((o) => o.shopId === 'topachat')
		expect(offer).to.include({ stale: true, priceCents: 57995, stock: 'out_of_stock' })
	})

	it('should answer not-found for an unknown product', async () => {
		const { uc } = testWorld()
		const error = (await uc.getProduct
			.Execute('01JZZZZZZZZZZZZZZZZZZZZZZZ', null)
			.catch((e: unknown) => e)) as FunctionalError
		expect([error.code, error.reason]).to.deep.equal(['not-found', 'product'])
	})
})

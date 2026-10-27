import { FunctionalError } from '@Voikyrioh/observability'
import { expect } from 'chai'
import { reading, testWorld } from '../../../__tests__/support/fakes'
import { ScrapeFailure } from '../../ports/scraper'

describe('us-chercher-un-produit (StartSearch / GetSearch)', () => {
	it('should query every searchable shop and group offers by product', async () => {
		const { uc, scraper } = testWorld()
		scraper.searches.set('ldlc', [
			reading('https://www.ldlc.com/fiche/PB1.html', { gtin: '4711377157834' }),
			reading('https://www.ldlc.com/fiche/PB2.html', {
				title: 'Gigabyte RTX 4070',
				stock: 'out_of_stock',
				priceCents: 57990,
			}),
		])
		scraper.searches.set('materielnet', [
			reading('https://www.materiel.net/produit/1.html', {
				gtin: '04711377157834',
				priceCents: 60490,
			}),
		])
		scraper.searches.set('topachat', new ScrapeFailure('blocked', '429'))

		const started = await uc.startSearch.Execute('  RTX   4070 ')
		expect(started.query).to.equal('RTX 4070')
		expect(started.shops.map((s) => s.shopId)).to.deep.equal(['ldlc', 'materielnet', 'topachat'])
		await uc.runs.get(started.id)?.settled

		const view = await uc.getSearch.Execute(started.id)
		expect(view.done).to.equal(true)
		expect(
			Object.fromEntries(view.shops.map((s) => [s.shopId, [s.status, s.offerCount]])),
		).to.deep.equal({
			ldlc: ['done', 2],
			materielnet: ['done', 1],
			topachat: ['blocked', 0],
		})
		// Same GTIN → one product with two offers, the cheapest available first.
		expect(view.results).to.have.length(2)
		const first = view.results[0]
		expect(first?.offers.map((o) => [o.shopName, o.priceCents])).to.deep.equal([
			['LDLC', 59995],
			['Materiel.net', 60490],
		])
		expect(view.results[1]?.offers[0]?.stock).to.equal('out_of_stock')
	})

	it('should not wait for a slow shop (BR-SEARCH-002)', async () => {
		const { uc, scraper } = testWorld({ shopTimeoutMs: 50 })
		scraper.searches.set('ldlc', [reading('https://www.ldlc.com/fiche/PB1.html')])
		scraper.searches.set('materielnet', 'hang')
		const started = await uc.startSearch.Execute('rtx 4070')
		await uc.runs.get(started.id)?.settled
		const view = await uc.getSearch.Execute(started.id)
		expect(view.shops.find((s) => s.shopId === 'materielnet')?.status).to.equal('timeout')
		expect(view.results).to.have.length(1)
	})

	it('should reuse the same search and the cache for 15 minutes (BR-SEARCH-003)', async () => {
		const { uc, scraper, clock } = testWorld()
		scraper.searches.set('ldlc', [reading('https://www.ldlc.com/fiche/PB1.html')])
		const a = await uc.startSearch.Execute('rtx 4070')
		await uc.runs.get(a.id)?.settled
		const b = await uc.startSearch.Execute('RTX  4070')
		expect(b.id).to.equal(a.id)

		clock.advance(16 * 60_000)
		const c = await uc.startSearch.Execute('rtx 4070')
		expect(c.id).to.not.equal(a.id)
		await uc.runs.get(c.id)?.settled
		expect(scraper.searchCalls.filter((s) => s === 'ldlc')).to.have.length(2)

		// A new run within the cache window uses the stored readings.
		const world = testWorld()
		world.scraper.searches.set('ldlc', [reading('https://www.ldlc.com/fiche/PB1.html')])
		const first = await world.uc.startSearch.Execute('ssd 2 to')
		await world.uc.runs.get(first.id)?.settled
		;(world.uc.runs as unknown as { byKey: Map<string, string> }).byKey.clear()
		const second = await world.uc.startSearch.Execute('ssd 2 to')
		await world.uc.runs.get(second.id)?.settled
		const view = await world.uc.getSearch.Execute(second.id)
		expect(view.shops.find((s) => s.shopId === 'ldlc')?.status).to.equal('cached')
		expect(view.results).to.have.length(1)
		expect(world.scraper.searchCalls.filter((s) => s === 'ldlc')).to.have.length(1)
	})

	it('should mark a shop whose robots.txt forbids the search (BR-SHOP-001)', async () => {
		const { uc, scraper } = testWorld()
		scraper.searches.set('topachat', new ScrapeFailure('robots', 'no'))
		const s = await uc.startSearch.Execute('rtx 4070')
		await uc.runs.get(s.id)?.settled
		const shops = await uc.listShops.Execute()
		expect(shops.find((x) => x.id === 'topachat')?.state).to.equal('forbidden')
		expect(shops.find((x) => x.id === 'ldlc')?.state).to.equal('operational')
		expect(shops.find((x) => x.id === 'pccomponentes')).to.include({ state: 'unknown' })
		expect(shops.find((x) => x.id === 'pccomponentes')?.capabilities).to.deep.equal(['url'])
	})

	it('should refuse a query out of bounds', async () => {
		const { uc } = testWorld()
		const error = await uc.startSearch.Execute(' a ').catch((e: unknown) => e)
		expect(error).to.be.instanceOf(FunctionalError)
		expect((error as FunctionalError).reason).to.equal('query-length')
		const missing = await uc.getSearch
			.Execute('01JZZZZZZZZZZZZZZZZZZZZZZZ')
			.catch((e: unknown) => e)
		expect((missing as FunctionalError).code).to.equal('not-found')
	})

	it('should keep a snapshot only when price or stock change (BR-OFFER-001)', async () => {
		const { uc, scraper, repos, clock } = testWorld()
		const url = 'https://www.ldlc.com/fiche/PB1.html'
		scraper.searches.set('ldlc', [reading(url)])
		let s = await uc.startSearch.Execute('rtx 4070')
		await uc.runs.get(s.id)?.settled
		clock.advance(16 * 60_000)
		s = await uc.startSearch.Execute('rtx 4070')
		await uc.runs.get(s.id)?.settled
		expect(repos.store.snapshots).to.have.length(1)
		clock.advance(16 * 60_000)
		scraper.searches.set('ldlc', [reading(url, { stock: 'out_of_stock' })])
		s = await uc.startSearch.Execute('rtx 4070')
		await uc.runs.get(s.id)?.settled
		expect(repos.store.snapshots.map((x) => x.stock)).to.deep.equal(['in_stock', 'out_of_stock'])
	})
})

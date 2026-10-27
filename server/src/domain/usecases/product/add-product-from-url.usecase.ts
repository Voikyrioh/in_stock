import { FunctionalError, UseCase } from '@Voikyrioh/observability'
import type { OfferRepository } from '../../ports/repositories'
import { ScrapeFailure, type Scraper, type ShopCatalog } from '../../ports/scraper'
import { checkUrlShape, normaliseOfferUrl, shopNameFromHost } from '../../rules/url'
import type { OfferRecorder } from '../shared/offer-recorder'
import type { ShopHealthRecorder } from '../shared/shop-health-recorder'

/** us-ajouter-par-lien: any product page, of a listed shop or not. */
export class AddProductFromUrlUseCase extends UseCase {
	constructor(
		private readonly deps: {
			scraper: Scraper
			catalog: ShopCatalog
			offers: OfferRepository
			recorder: OfferRecorder
			health: ShopHealthRecorder
		},
	) {
		super()
	}

	async Execute(rawUrl: string): Promise<{ productId: string; created: boolean }> {
		const shape = checkUrlShape(rawUrl)
		if (!shape.ok) {
			throw new FunctionalError(
				'invalid-payload',
				'This link cannot be read',
				undefined,
				shape.problem === 'format' ? 'url-format' : 'url-forbidden',
			)
		}
		const url = normaliseOfferUrl(shape.url)
		// BR-SCRAPE-005: a known link leads to the same product.
		const known = await this.deps.offers.findByUrl(url)
		if (known) return { productId: known.productId, created: false }

		const shop = this.deps.catalog.forUrl(shape.url)
		const shopId = shop?.id ?? shopNameFromHost(shape.url.hostname)
		let reading: Awaited<ReturnType<Scraper['readProduct']>>
		try {
			reading = await this.runStep('Read page', () =>
				this.deps.scraper.readProduct(url, AbortSignal.timeout(25_000)),
			)
		} catch (error) {
			if (!(error instanceof ScrapeFailure)) throw error
			await this.deps.health.failure(shopId, error, 'product')
			throw toFunctional(error)
		}
		const recorded = await this.runStep('Record offer', () =>
			this.deps.recorder.record(shopId, reading),
		)
		await this.deps.health.success(shopId, 'product')
		return { productId: recorded.product.id, created: true }
	}
}

function toFunctional(error: ScrapeFailure): FunctionalError {
	switch (error.kind) {
		case 'forbidden-address':
			return new FunctionalError(
				'invalid-payload',
				'This link cannot be read',
				undefined,
				'url-forbidden',
			)
		case 'no-product':
		case 'not-html':
			return new FunctionalError(
				'invalid-payload',
				'No product found on this page',
				undefined,
				'no-product',
			)
		case 'robots':
			return new FunctionalError(
				'forbidden',
				'The shop forbids automated reading of this page',
				undefined,
				'robots',
			)
		case 'blocked':
			return new FunctionalError(
				'service-unavailable',
				'The shop blocks our robot',
				undefined,
				'blocked',
			)
		default:
			return new FunctionalError(
				'service-unavailable',
				'The site did not answer',
				undefined,
				'unreachable',
			)
	}
}

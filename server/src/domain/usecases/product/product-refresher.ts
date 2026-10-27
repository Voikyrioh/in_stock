import { Logger } from '@Voikyrioh/observability'
import type { Offer } from '../../entities/offer'
import type { OfferRepository, ProductRepository } from '../../ports/repositories'
import { ScrapeFailure, type Scraper } from '../../ports/scraper'
import type { Clock } from '../../ports/system'
import type { ReadingTrigger } from '../../rules/robots'
import type { ShopHealthRecorder } from '../shared/shop-health-recorder'

const READ_TIMEOUT_MS = 25_000

/**
 * Reads again the offers of a product. One refresh per product at a time:
 * a second request waits for the running one instead of hitting the shops again.
 */
export class ProductRefresher {
	private readonly running = new Map<string, Promise<void>>()

	constructor(
		private readonly deps: {
			scraper: Scraper
			offers: OfferRepository
			products: ProductRepository
			health: ShopHealthRecorder
			clock: Clock
		},
	) {}

	isRunning(productId: string): boolean {
		return this.running.has(productId)
	}

	/** `trigger`: 'user' for a product page or « Actualiser », 'schedule' for followed products. */
	refresh(productId: string, trigger: ReadingTrigger): Promise<void> {
		const current = this.running.get(productId)
		if (current) return current
		const task = this.deps.offers
			.listByProduct(productId)
			.then((offers) =>
				Promise.allSettled(offers.map((offer) => this.refreshOffer(offer, trigger))),
			)
			.then(() => undefined)
			.finally(() => this.running.delete(productId))
		this.running.set(productId, task)
		return task
	}

	/** Background refresh (BR-OFFER-002): failures are logged, never thrown. */
	trigger(productId: string): void {
		// The person is looking at this product right now: their request (BR-SCRAPE-001).
		this.refresh(productId, 'user').catch((error: unknown) =>
			Logger.error({ err: error, productId }, 'Background refresh failed'),
		)
	}

	/** BR-OFFER-004: a failed reading keeps the last known state and marks the offer. */
	async refreshOffer(offer: Offer, trigger: ReadingTrigger): Promise<void> {
		const { scraper, offers, products, health, clock } = this.deps
		try {
			const reading = await scraper.readProduct(offer.url, {
				signal: AbortSignal.timeout(READ_TIMEOUT_MS),
				trigger,
			})
			const { offer: next, changed } = offer.withReading(reading, clock.now())
			await offers.save(next, { snapshot: changed })
			const product = await products.findById(offer.productId)
			if (product) {
				const enriched = product.enrich(
					{
						imageUrl:
							reading.imageUrl && /^https?:\/\//.test(reading.imageUrl) ? reading.imageUrl : null,
					},
					clock.now(),
				)
				if (enriched !== product) await products.save(enriched)
			}
			await health.success(offer.shopId, 'product')
		} catch (error) {
			const kind = error instanceof ScrapeFailure ? error.kind : 'error'
			if (!(error instanceof ScrapeFailure))
				Logger.error({ err: error, offerId: offer.id }, 'Offer refresh crashed')
			await offers.save(offer.withFailure(kind, clock.now()), { snapshot: false })
			await health.failure(offer.shopId, error, 'product')
		}
	}
}

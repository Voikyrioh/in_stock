import { UseCase } from '@Voikyrioh/observability'
import { LIMITS } from '@in-stock/shared'
import type { OfferRepository } from '../../ports/repositories'
import type { Clock } from '../../ports/system'
import type { ProductRefresher } from '../product/product-refresher'

/**
 * BR-FOLLOW-003 — followed offers older than 30 minutes, oldest first, a small
 * batch per tick so that readings spread over time instead of bursting.
 */
export class RefreshDueOffersUseCase extends UseCase {
	constructor(
		private readonly deps: {
			offers: OfferRepository
			refresher: ProductRefresher
			clock: Clock
			batchSize?: number
		},
	) {
		super()
	}

	async Execute(): Promise<number> {
		const before = new Date(this.deps.clock.now().getTime() - LIMITS.staleAfterMs)
		const due = await this.runStep('List due offers', () =>
			this.deps.offers.listDueFollowed(before, this.deps.batchSize ?? 20),
		)
		await this.runStep('Read offers', () =>
			Promise.allSettled(due.map((offer) => this.deps.refresher.refreshOffer(offer, 'schedule'))),
		)
		return due.length
	}
}

import { Logger } from '@Voikyrioh/observability'
import { type ReadingContext, ShopHealth } from '../../entities/shop-health'
import type { ShopHealthRepository } from '../../ports/repositories'
import { ScrapeFailure, type ShopCatalog } from '../../ports/scraper'
import type { Clock } from '../../ports/system'
import { KeyedMutex } from './keyed-mutex'

/** Keeps the reading history of known shops (BR-SHOP-001). Unlisted sites have none. */
export class ShopHealthRecorder {
	private readonly mutex = new KeyedMutex()

	constructor(
		private readonly deps: { health: ShopHealthRepository; catalog: ShopCatalog; clock: Clock },
	) {}

	async success(shopId: string, from: ReadingContext): Promise<void> {
		await this.update(shopId, (h, now) => h.succeeded(now, from))
	}

	/**
	 * A robots.txt refusal of the search page makes the shop « forbidden »; on a
	 * product page it is the shop's choice for that page, not a malfunction.
	 */
	async failure(shopId: string, error: unknown, from: ReadingContext): Promise<void> {
		const failure = error instanceof ScrapeFailure ? error : null
		if (failure?.kind === 'robots' && from === 'product') return
		await this.update(shopId, (h, now) =>
			failure?.kind === 'robots'
				? h.forbiddenByRobots(now)
				: h.failed(failure?.kind ?? 'error', now, failure?.pausedUntil ?? null),
		)
	}

	private async update(
		shopId: string,
		change: (h: ShopHealth, now: Date) => ShopHealth,
	): Promise<void> {
		if (!this.deps.catalog.get(shopId)) return
		try {
			await this.mutex.run(shopId, async () => {
				const current = (await this.deps.health.get(shopId)) ?? ShopHealth.empty(shopId)
				await this.deps.health.save(change(current, this.deps.clock.now()))
			})
		} catch (error) {
			// Health is informative: never fail a reading because of it.
			Logger.warn({ err: error, shopId }, 'Shop health not saved')
		}
	}
}

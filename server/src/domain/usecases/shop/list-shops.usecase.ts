import { UseCase } from '@Voikyrioh/observability'
import type { ShopView } from '@in-stock/shared'
import type { ShopHealthRepository } from '../../ports/repositories'
import type { ShopCatalog } from '../../ports/scraper'
import type { Clock } from '../../ports/system'
import { shopState } from '../../rules/shop-state'

export class ListShopsUseCase extends UseCase {
	constructor(
		private readonly deps: { catalog: ShopCatalog; health: ShopHealthRepository; clock: Clock },
	) {
		super()
	}

	async Execute(): Promise<ShopView[]> {
		const health = new Map((await this.deps.health.list()).map((h) => [h.shopId, h.facts()]))
		const now = this.deps.clock.now()
		return this.deps.catalog.list().map((shop) => {
			const facts = health.get(shop.id) ?? null
			return {
				id: shop.id,
				name: shop.name,
				country: shop.country,
				homepage: shop.homepage,
				capabilities: shop.capabilities,
				state: shopState(facts, now),
				lastSuccessAt: facts?.lastSuccessAt?.toISOString() ?? null,
			}
		})
	}
}

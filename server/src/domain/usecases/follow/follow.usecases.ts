import { FunctionalError, UseCase } from '@Voikyrioh/observability'
import type { FollowView } from '@in-stock/shared'
import { isAvailable } from '@in-stock/shared'
import type { FollowRepository, OfferRepository, ProductRepository } from '../../ports/repositories'
import type { ShopCatalog } from '../../ports/scraper'
import type { Clock } from '../../ports/system'
import { canFollowMore, compareFollows } from '../../rules/follows'
import { bestOffer } from '../../rules/offers'
import { toOfferView, toProductSummary } from '../shared/views'

export interface FollowDeps {
	follows: FollowRepository
	products: ProductRepository
	offers: OfferRepository
	catalog: ShopCatalog
	clock: Clock
}

/** BR-FOLLOW-001 / BR-FOLLOW-002 — idempotent, 100 products at most. */
export class FollowUseCase extends UseCase {
	constructor(private readonly deps: FollowDeps) {
		super()
	}

	async Execute(userId: string, productId: string): Promise<void> {
		if (!(await this.deps.products.findById(productId))) {
			throw new FunctionalError('not-found', 'Product not found', undefined, 'product')
		}
		if (await this.deps.follows.isFollowing(userId, productId)) return
		if (!canFollowMore(await this.deps.follows.count(userId))) {
			throw new FunctionalError('conflict', 'Follow limit reached', undefined, 'follow-limit')
		}
		await this.deps.follows.add(userId, productId, this.deps.clock.now())
	}
}

export class UnfollowUseCase extends UseCase {
	constructor(private readonly deps: FollowDeps) {
		super()
	}

	async Execute(userId: string, productId: string): Promise<void> {
		await this.deps.follows.remove(userId, productId)
	}
}

export class ListFollowsUseCase extends UseCase {
	constructor(private readonly deps: FollowDeps) {
		super()
	}

	async Execute(userId: string): Promise<FollowView[]> {
		const follows = await this.deps.follows.list(userId)
		const ids = follows.map((f) => f.productId)
		const [products, offers] = await Promise.all([
			this.deps.products.findByIds(ids),
			this.deps.offers.listByProducts(ids),
		])
		const productById = new Map(products.map((p) => [p.id, p]))
		const rows = follows.flatMap((follow) => {
			const product = productById.get(follow.productId)
			if (!product) return []
			const own = offers.filter((o) => o.productId === product.id)
			const best = bestOffer(own)
			const checks = own.map((o) => o.lastCheckedAt?.getTime() ?? 0).filter((t) => t > 0)
			return [
				{
					facts: {
						inStockCount: own.filter((o) => isAvailable(o.stock)).length,
						bestPriceCents: best?.priceCents ?? null,
						followedAt: follow.followedAt,
					},
					view: {
						product: toProductSummary(product),
						bestOffer: best ? toOfferView(best, this.deps.catalog) : null,
						inStockCount: own.filter((o) => isAvailable(o.stock)).length,
						lastCheckedAt: checks.length ? new Date(Math.max(...checks)).toISOString() : null,
						followedAt: follow.followedAt.toISOString(),
					} satisfies FollowView,
				},
			]
		})
		return rows.sort((a, b) => compareFollows(a.facts, b.facts)).map((r) => r.view)
	}
}

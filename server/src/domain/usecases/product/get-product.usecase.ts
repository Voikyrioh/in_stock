import { FunctionalError, UseCase } from '@Voikyrioh/observability'
import type { ProductResponse } from '@in-stock/shared'
import type { FollowRepository, OfferRepository, ProductRepository } from '../../ports/repositories'
import type { ShopCatalog } from '../../ports/scraper'
import type { Clock } from '../../ports/system'
import { bestOffer, compareOffers, isDue } from '../../rules/offers'
import { toOfferView, toProductDetails } from '../shared/views'
import type { ProductRefresher } from './product-refresher'

export interface ProductDeps {
	products: ProductRepository
	offers: OfferRepository
	follows: FollowRepository
	catalog: ShopCatalog
	refresher: ProductRefresher
	clock: Clock
}

/** Product page view. Shared by the read, the refresh and the follow toggles. */
export async function productView(
	deps: ProductDeps,
	productId: string,
	userId: string | null,
): Promise<ProductResponse> {
	const product = await deps.products.findById(productId)
	if (!product) throw new FunctionalError('not-found', 'Product not found', undefined, 'product')
	const offers = (await deps.offers.listByProduct(productId)).sort((a, b) => compareOffers(a, b))
	const views = offers.map((o) => toOfferView(o, deps.catalog))
	const best = bestOffer(offers)
	return {
		product: toProductDetails(product),
		offers: views,
		bestOffer: best ? (views.find((v) => v.id === best.id) ?? null) : null,
		followed: userId ? await deps.follows.isFollowing(userId, productId) : false,
		refreshing: deps.refresher.isRunning(productId),
	}
}

export class GetProductUseCase extends UseCase {
	constructor(private readonly deps: ProductDeps) {
		super()
	}

	async Execute(productId: string, userId: string | null): Promise<ProductResponse> {
		const view = await productView(this.deps, productId, userId)
		const now = this.deps.clock.now()
		// BR-OFFER-002: offers older than 30 min are read again in the background.
		const due = view.offers.some((o) =>
			isDue(o.lastCheckedAt ? new Date(o.lastCheckedAt) : null, now),
		)
		if (due && !view.refreshing) {
			this.deps.refresher.trigger(productId)
			return { ...view, refreshing: true }
		}
		return view
	}
}

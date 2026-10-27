import { FunctionalError, UseCase } from '@Voikyrioh/observability'
import type { ProductResponse } from '@in-stock/shared'
import { refreshCooldownLeft } from '../../rules/offers'
import { type ProductDeps, productView } from './get-product.usecase'

export class RefreshProductUseCase extends UseCase {
	constructor(private readonly deps: ProductDeps) {
		super()
	}

	async Execute(productId: string, userId: string | null): Promise<ProductResponse> {
		const product = await this.deps.products.findById(productId)
		if (!product) throw new FunctionalError('not-found', 'Product not found', undefined, 'product')
		const offers = await this.deps.offers.listByProduct(productId)
		const left = refreshCooldownLeft(
			offers.map((o) => o.lastCheckedAt),
			this.deps.clock.now(),
		)
		// BR-OFFER-003: once every 2 minutes, unless a refresh is already running (then we wait for it).
		if (left > 0 && !this.deps.refresher.isRunning(productId)) {
			throw new FunctionalError(
				'rate-limited',
				'Prices were just read',
				{ retryAfterSeconds: Math.ceil(left / 1000) },
				'refresh-too-soon',
			)
		}
		await this.runStep('Read shops', () => this.deps.refresher.refresh(productId, 'user'))
		return productView(this.deps, productId, userId)
	}
}

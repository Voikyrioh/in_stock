import type { OfferView, ProductDetails, ProductSummary } from '@in-stock/shared'
import type { Offer } from '../../entities/offer'
import type { Product } from '../../entities/product'
import type { ShopCatalog } from '../../ports/scraper'

export function toProductSummary(product: Product): ProductSummary {
	return { id: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl }
}

export function toProductDetails(product: Product): ProductDetails {
	return { ...toProductSummary(product), gtin: product.gtin, mpn: product.mpn }
}

export function toOfferView(offer: Offer, catalog: ShopCatalog): OfferView {
	return {
		id: offer.id,
		shopId: offer.shopId,
		shopName: catalog.get(offer.shopId)?.name ?? offer.shopId,
		url: offer.url,
		title: offer.title,
		priceCents: offer.priceCents,
		currency: offer.currency,
		stock: offer.stock,
		lastCheckedAt: offer.lastCheckedAt?.toISOString() ?? null,
		lastSuccessAt: offer.lastSuccessAt?.toISOString() ?? null,
		stale: offer.stale,
	}
}

import type { StockState } from './stock'

/** Error body produced by @Voikyrioh/observability handleHttpErrors. */
export interface ApiErrorBody {
	code: string
	message: string
	reason?: string
	details?: { field: string; code: string; message: string }[]
}

export interface ProductSummary {
	id: string
	name: string
	brand: string | null
	imageUrl: string | null
}

export interface ProductDetails extends ProductSummary {
	gtin: string | null
	mpn: string | null
}

export interface OfferView {
	id: string
	shopId: string
	shopName: string
	url: string
	title: string
	priceCents: number | null
	currency: string
	stock: StockState
	lastCheckedAt: string | null
	lastSuccessAt: string | null
	/** The last refresh failed: the values shown are the last known ones. */
	stale: boolean
}

export interface ProductResponse {
	product: ProductDetails
	offers: OfferView[]
	bestOffer: OfferView | null
	followed: boolean
	refreshing: boolean
}

export type SearchShopStatus =
	| 'pending'
	| 'done'
	| 'cached'
	| 'failed'
	| 'timeout'
	| 'forbidden'
	| 'blocked'

export interface SearchShopView {
	shopId: string
	name: string
	status: SearchShopStatus
	offerCount: number
	fetchedAt: string | null
}

export interface SearchResultGroup {
	product: ProductSummary
	offers: OfferView[]
}

export interface SearchView {
	id: string
	query: string
	startedAt: string
	done: boolean
	shops: SearchShopView[]
	results: SearchResultGroup[]
}

export type ShopState = 'operational' | 'degraded' | 'down' | 'forbidden' | 'unknown'

export interface ShopView {
	id: string
	name: string
	country: string
	homepage: string
	capabilities: ('search' | 'url')[]
	state: ShopState
	lastSuccessAt: string | null
}

export interface UserView {
	id: string
	email: string
	createdAt: string
}

export interface FollowView {
	product: ProductSummary
	bestOffer: OfferView | null
	inStockCount: number
	lastCheckedAt: string | null
	followedAt: string
}

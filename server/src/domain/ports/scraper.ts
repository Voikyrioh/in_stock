import type { StockState } from '@in-stock/shared'

/** What the robot read for one offer, before it is matched to a product. */
export interface ScrapedOffer {
	url: string
	title: string
	priceCents: number | null
	currency: string
	stock: StockState
	brand: string | null
	gtin: string | null
	mpn: string | null
	imageUrl: string | null
}

export type ScrapeFailureKind =
	| 'forbidden-address'
	| 'robots'
	| 'unreachable'
	| 'timeout'
	| 'blocked'
	| 'http'
	| 'not-html'
	| 'too-large'
	| 'no-product'
	| 'unsupported'

/** An expected reading failure. Anything else thrown by the robot is a bug. */
export class ScrapeFailure extends Error {
	constructor(
		readonly kind: ScrapeFailureKind,
		message: string,
		/** Set when the shop asked us to wait (429, 503, anti-robot page). */
		readonly pausedUntil: Date | null = null,
	) {
		super(message)
		this.name = 'ScrapeFailure'
	}
}

export interface Scraper {
	/** Offers found by the shop search page for this query (BR-SEARCH-004: 10 at most). */
	search(shopId: string, query: string, signal: AbortSignal): Promise<ScrapedOffer[]>
	/** Reads one product page, of a known shop or not. */
	readProduct(url: string, signal?: AbortSignal): Promise<ScrapedOffer>
}

export interface ShopInfo {
	id: string
	name: string
	country: string
	homepage: string
	capabilities: ('search' | 'url')[]
}

export interface ShopCatalog {
	/** Enabled shops, in display order. */
	list(): ShopInfo[]
	get(id: string): ShopInfo | null
	/** Known shop serving this URL, null for any other site. */
	forUrl(url: URL): ShopInfo | null
}

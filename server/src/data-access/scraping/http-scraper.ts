import { type ScrapedOffer, ScrapeFailure, type Scraper } from '../../domain/ports/scraper'
import { extractListing, type ListedOffer } from './extract/listing'
import { extractProduct, isProduct } from './extract/product-page'
import type { HostQueue } from './host-queue'
import type { HttpPage, SafeHttpClient } from './http-client'
import type { RobotsPolicy } from './robots'
import type { StaticShopCatalog } from './shops/catalog'

/** BR-SEARCH-004: 10 offers per shop, 4 of them completed from their page when needed. */
const LISTING_LIMIT = 10
const ENRICH_LIMIT = 4

export interface ScraperDeps {
	http: SafeHttpClient
	queue: HostQueue
	robots: RobotsPolicy
	catalog: StaticShopCatalog
	/** robots.txt can be ignored only for local experiments (never in production). */
	respectRobots?: boolean
}

export interface SearchDiagnostics {
	url: string
	strategy: string
	listed: ListedOffer[]
}

export class HttpScraper implements Scraper {
	constructor(private readonly deps: ScraperDeps) {}

	async search(shopId: string, query: string, signal: AbortSignal): Promise<ScrapedOffer[]> {
		return (await this.searchWithDiagnostics(shopId, query, signal)).offers
	}

	async searchWithDiagnostics(
		shopId: string,
		query: string,
		signal: AbortSignal,
	): Promise<{ offers: ScrapedOffer[]; diagnostics: SearchDiagnostics }> {
		const shop = this.deps.catalog.definition(shopId)
		if (!shop?.searchUrl) throw new ScrapeFailure('unsupported', `${shopId} has no search`)
		const url = shop.searchUrl(query)
		const page = await this.fetch(url, signal)
		const { offers: listed, strategy } = extractListing(page.body, {
			pageUrl: page.url,
			hosts: shop.hosts,
			productUrlPattern: shop.productUrlPattern,
			selectors: shop.listing,
			limit: LISTING_LIMIT,
		})
		const diagnostics = { url, strategy, listed }
		// A search with one exact match may land on the product page itself.
		if (listed.length === 0) {
			const product = extractProduct(page.body, page.url, shop.product)
			if (isProduct(product) && shop.productUrlPattern.test(page.url)) {
				return {
					offers: [toScraped(page.url, product)],
					diagnostics: { ...diagnostics, strategy: 'product-page' },
				}
			}
			return { offers: [], diagnostics }
		}
		const offers: ScrapedOffer[] = []
		let enriched = 0
		for (const item of listed) {
			const incomplete = item.priceCents === null || item.stock === 'unknown'
			if (incomplete && enriched < ENRICH_LIMIT && !signal.aborted) {
				enriched++
				try {
					offers.push(merge(item, await this.readProduct(item.url, signal)))
					continue
				} catch (error) {
					if (!(error instanceof ScrapeFailure)) throw error
					// Keep what the listing gave; a slow page does not cost the whole shop.
				}
			}
			offers.push(fromListing(item))
		}
		return { offers, diagnostics }
	}

	async readProduct(url: string, signal?: AbortSignal): Promise<ScrapedOffer> {
		const shop = this.deps.catalog.definitionForHost(safeHost(url))
		const page = await this.fetch(url, signal)
		const product = extractProduct(page.body, page.url, shop?.product)
		if (!isProduct(product)) throw new ScrapeFailure('no-product', 'No product found on this page')
		return toScraped(page.url, product)
	}

	/** Every request: robots.txt, then the per-site queue, then the guarded client. */
	private async fetch(url: string, signal?: AbortSignal): Promise<HttpPage> {
		const host = safeHost(url)
		// The robots.txt download itself goes through the queue (see createRobotsPolicy).
		if (this.deps.respectRobots !== false) await this.deps.robots.assertAllowed(url, signal)
		return this.deps.queue.run(
			host,
			() => this.deps.http.get(url, { signal, expect: 'html' }),
			signal,
		)
	}
}

function safeHost(url: string): string {
	try {
		return new URL(url).hostname
	} catch {
		throw new ScrapeFailure('forbidden-address', 'Invalid link')
	}
}

function toScraped(url: string, product: ReturnType<typeof extractProduct>): ScrapedOffer {
	return {
		url,
		title: product.title ?? url,
		priceCents: product.priceCents,
		currency: product.currency,
		stock: product.stock,
		brand: product.brand,
		gtin: product.gtin,
		mpn: product.mpn,
		imageUrl: product.imageUrl,
	}
}

function fromListing(item: ListedOffer): ScrapedOffer {
	return { ...item, brand: null, gtin: null, mpn: null }
}

/** The product page knows better, except for the title the shop shows in its list. */
function merge(item: ListedOffer, page: ScrapedOffer): ScrapedOffer {
	return {
		...page,
		url: item.url,
		title: page.title || item.title,
		priceCents: page.priceCents ?? item.priceCents,
		currency: page.priceCents !== null ? page.currency : item.currency,
		stock: page.stock !== 'unknown' ? page.stock : item.stock,
		imageUrl: page.imageUrl ?? item.imageUrl,
	}
}

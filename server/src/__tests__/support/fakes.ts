import type { StockState } from '@in-stock/shared'
import { ulid } from 'ulid'
import type { Adapters } from '../../container'
import { buildUseCases } from '../../container'
import { memoryRepositories } from '../../data-access/repository/memory/memory.repositories'
import { StaticShopCatalog } from '../../data-access/scraping/shops/catalog'
import type { ShopDefinition } from '../../data-access/scraping/shops/definitions'
import { sha256TokenService } from '../../data-access/security/session-tokens'
import { type ScrapedOffer, ScrapeFailure, type Scraper } from '../../domain/ports/scraper'
import type { Clock, PasswordHasher } from '../../domain/ports/system'

export const TEST_SHOPS: ShopDefinition[] = [
	{
		id: 'ldlc',
		name: 'LDLC',
		country: 'FR',
		homepage: 'https://www.ldlc.com/',
		hosts: ['www.ldlc.com'],
		searchUrl: (q) => `https://www.ldlc.com/recherche/${q}/`,
		productUrlPattern: /\/fiche\//,
	},
	{
		id: 'materielnet',
		name: 'Materiel.net',
		country: 'FR',
		homepage: 'https://www.materiel.net/',
		hosts: ['www.materiel.net'],
		searchUrl: (q) => `https://www.materiel.net/recherche/${q}/`,
		productUrlPattern: /\/produit\//,
	},
	{
		id: 'topachat',
		name: 'Top Achat',
		country: 'FR',
		homepage: 'https://www.topachat.com/',
		hosts: ['www.topachat.com'],
		searchUrl: (q) => `https://www.topachat.com/recherche/${q}/`,
		productUrlPattern: /\/produit\//,
	},
	{
		id: 'pccomponentes',
		name: 'PcComponentes',
		country: 'FR',
		homepage: 'https://www.pccomponentes.fr/',
		hosts: ['www.pccomponentes.fr'],
		productUrlPattern: /pccomponentes/,
	},
]

export function reading(url: string, fields: Partial<ScrapedOffer> = {}): ScrapedOffer {
	return {
		url,
		title: 'MSI GeForce RTX 4070 SUPER VENTUS 2X OC',
		priceCents: 59995,
		currency: 'EUR',
		stock: 'in_stock' as StockState,
		brand: 'MSI',
		gtin: null,
		mpn: null,
		imageUrl: null,
		...fields,
	}
}

type Behaviour = ScrapedOffer[] | ScrapeFailure | 'hang'

/** Scripted robot: per shop search answers, per URL product pages. */
export class FakeScraper implements Scraper {
	searches = new Map<string, Behaviour>()
	pages = new Map<string, ScrapedOffer | ScrapeFailure>()
	searchCalls: string[] = []
	readCalls: string[] = []

	async search(shopId: string, _query: string, signal: AbortSignal): Promise<ScrapedOffer[]> {
		this.searchCalls.push(shopId)
		const behaviour = this.searches.get(shopId) ?? []
		if (behaviour === 'hang') {
			return new Promise((_, reject) =>
				signal.addEventListener('abort', () => reject(new ScrapeFailure('timeout', 'slow'))),
			)
		}
		if (behaviour instanceof ScrapeFailure) throw behaviour
		return behaviour
	}

	async readProduct(url: string): Promise<ScrapedOffer> {
		this.readCalls.push(url)
		const page = this.pages.get(url)
		if (!page) throw new ScrapeFailure('no-product', 'none')
		if (page instanceof ScrapeFailure) throw page
		return page
	}
}

export class FakeClock implements Clock {
	constructor(public current = new Date('2026-10-27T12:00:00Z')) {}
	now() {
		return new Date(this.current)
	}
	advance(ms: number) {
		this.current = new Date(this.current.getTime() + ms)
	}
}

/** Fast stand-in for argon2 in use case tests (argon2 itself has its own test). */
export const fakeHasher: PasswordHasher = {
	hash: async (password) => `fake$${sha256TokenService.digest(password)}`,
	verify: async (hash, password) => hash === `fake$${sha256TokenService.digest(password)}`,
}

export function testWorld(options: { shopTimeoutMs?: number } = {}) {
	const repos = memoryRepositories()
	const scraper = new FakeScraper()
	const clock = new FakeClock()
	const catalog = new StaticShopCatalog([], TEST_SHOPS)
	const adapters: Adapters = {
		...repos,
		scraper,
		catalog,
		clock,
		ids: { next: () => ulid() },
		hasher: fakeHasher,
		tokens: sha256TokenService,
	}
	const uc = buildUseCases(adapters, { shopTimeoutMs: options.shopTimeoutMs ?? 200 })
	return { uc, repos, scraper, clock, catalog }
}

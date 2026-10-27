import { Logger, UseCase } from '@Voikyrioh/observability'
import type { SearchShopStatus, SearchView } from '@in-stock/shared'
import type {
	OfferRepository,
	ProductRepository,
	SearchCacheRepository,
} from '../../ports/repositories'
import { ScrapeFailure, type Scraper, type ShopCatalog, type ShopInfo } from '../../ports/scraper'
import type { Clock, IdGenerator } from '../../ports/system'
import { compareOffers } from '../../rules/offers'
import { queryKey } from '../../rules/query'
import type { OfferRecorder } from '../shared/offer-recorder'
import type { ShopHealthRecorder } from '../shared/shop-health-recorder'
import { toOfferView, toProductSummary } from '../shared/views'

interface RunShop {
	shopId: string
	name: string
	status: SearchShopStatus
	offerIds: string[]
	fetchedAt: Date | null
}

export interface SearchRun {
	id: string
	query: string
	key: string
	startedAt: Date
	shops: RunShop[]
	/** Resolves when every shop has answered (tests, graceful stop). */
	settled: Promise<void>
}

export interface SearchRunsDeps {
	scraper: Scraper
	catalog: ShopCatalog
	cache: SearchCacheRepository
	offers: OfferRepository
	products: ProductRepository
	recorder: OfferRecorder
	health: ShopHealthRecorder
	clock: Clock
	ids: IdGenerator
	/** BR-SEARCH-002: a shop has 20 s at most. */
	shopTimeoutMs?: number
}

const REUSE_MS = 15 * 60_000 // BR-SEARCH-003
const KEEP_MS = 30 * 60_000

/** Searches in progress or recent, in memory (mono-instance service). */
export class SearchRuns {
	private readonly byId = new Map<string, SearchRun>()
	private readonly byKey = new Map<string, string>()
	private readonly searchShop: SearchShopUseCase

	constructor(private readonly deps: SearchRunsDeps) {
		this.searchShop = new SearchShopUseCase(deps)
	}

	/** BR-SEARCH-002: every searchable shop at once. The same query within 15 min reuses the run. */
	start(query: string): SearchRun {
		const now = this.deps.clock.now()
		this.purge(now)
		const key = queryKey(query)
		const reused = this.byId.get(this.byKey.get(key) ?? '')
		if (reused && now.getTime() - reused.startedAt.getTime() < REUSE_MS) return reused

		const shops = this.deps.catalog
			.list()
			.filter((shop) => shop.capabilities.includes('search'))
			.map<RunShop>((shop) => ({
				shopId: shop.id,
				name: shop.name,
				status: 'pending',
				offerIds: [],
				fetchedAt: null,
			}))
		const run: SearchRun = {
			id: this.deps.ids.next(),
			query,
			key,
			startedAt: now,
			shops,
			settled: Promise.resolve(),
		}
		run.settled = Promise.all(
			shops.map((rs) => {
				const shop = this.deps.catalog.get(rs.shopId) as ShopInfo
				return this.searchShop.Execute(run, rs, shop).catch((error: unknown) => {
					Logger.error({ err: error, shopId: rs.shopId }, 'Shop search crashed')
					rs.status = 'failed'
				})
			}),
		).then(() => undefined)
		this.byId.set(run.id, run)
		this.byKey.set(key, run.id)
		return run
	}

	get(id: string): SearchRun | null {
		return this.byId.get(id) ?? null
	}

	async view(run: SearchRun): Promise<SearchView> {
		const offerIds = [...new Set(run.shops.flatMap((s) => s.offerIds))]
		const offers = await this.deps.offers.findByIds(offerIds)
		const products = new Map(
			(await this.deps.products.findByIds([...new Set(offers.map((o) => o.productId))])).map(
				(p) => [p.id, p],
			),
		)
		const groups = new Map<string, typeof offers>()
		for (const offer of offers) {
			if (!products.has(offer.productId)) continue
			const list = groups.get(offer.productId) ?? []
			list.push(offer)
			groups.set(offer.productId, list)
		}
		const results = [...groups.entries()]
			.map(([productId, list]) => ({ productId, list: list.sort((a, b) => compareOffers(a, b)) }))
			.sort((a, b) =>
				compareOffers(a.list[0] as (typeof offers)[number], b.list[0] as (typeof offers)[number]),
			)
			.map(({ productId, list }) => ({
				product: toProductSummary(
					products.get(productId) as NonNullable<ReturnType<typeof products.get>>,
				),
				offers: list.map((o) => toOfferView(o, this.deps.catalog)),
			}))
		return {
			id: run.id,
			query: run.query,
			startedAt: run.startedAt.toISOString(),
			done: run.shops.every((s) => s.status !== 'pending'),
			shops: run.shops.map((s) => ({
				shopId: s.shopId,
				name: s.name,
				status: s.status,
				offerCount: s.offerIds.length,
				fetchedAt: s.fetchedAt?.toISOString() ?? null,
			})),
			results,
		}
	}

	private purge(now: Date) {
		for (const [id, run] of this.byId) {
			if (now.getTime() - run.startedAt.getTime() > KEEP_MS) {
				this.byId.delete(id)
				if (this.byKey.get(run.key) === id) this.byKey.delete(run.key)
			}
		}
	}
}

/** One shop of one search: cache, or live reading within the deadline. One span per shop. */
class SearchShopUseCase extends UseCase {
	constructor(private readonly deps: SearchRunsDeps) {
		super()
	}

	async Execute(run: SearchRun, rs: RunShop, shop: ShopInfo): Promise<void> {
		const { cache, clock, scraper, recorder, health } = this.deps
		const now = clock.now()
		const cached = await this.runStep('Read cache', () =>
			cache.get(run.key, shop.id, new Date(now.getTime() - REUSE_MS)),
		)
		if (cached) {
			for (const reading of cached.offers) {
				rs.offerIds.push((await recorder.ensure(shop.id, reading)).offer.id)
			}
			rs.fetchedAt = cached.fetchedAt
			rs.status = 'cached'
			return
		}
		try {
			const timeoutMs = this.deps.shopTimeoutMs ?? 20_000
			const readings = await this.runStep('Read shop', () =>
				withDeadline(scraper.search(shop.id, run.query, AbortSignal.timeout(timeoutMs)), timeoutMs),
			)
			await this.runStep('Record offers', async () => {
				for (const reading of readings)
					rs.offerIds.push((await recorder.record(shop.id, reading)).offer.id)
			})
			const fetchedAt = clock.now()
			await cache.put(run.key, shop.id, readings, fetchedAt)
			await health.success(shop.id, 'search')
			rs.fetchedAt = fetchedAt
			rs.status = 'done'
			Logger.info({ shopId: shop.id, offers: readings.length }, 'Shop searched')
		} catch (error) {
			if (!(error instanceof ScrapeFailure)) throw error
			await health.failure(shop.id, error, 'search')
			rs.status = statusOf(error)
			Logger.info({ shopId: shop.id, kind: error.kind }, 'Shop search failed')
		}
	}
}

function statusOf(error: ScrapeFailure): SearchShopStatus {
	if (error.kind === 'robots') return 'forbidden'
	if (error.kind === 'timeout') return 'timeout'
	if (error.kind === 'blocked') return 'blocked'
	return 'failed'
}

/** The robot honours the abort signal; this is the safety net if a step ignores it. */
function withDeadline<T>(task: Promise<T>, ms: number): Promise<T> {
	let timer: NodeJS.Timeout | undefined
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new ScrapeFailure('timeout', `No answer within ${ms} ms`)),
			ms + 1000,
		)
	})
	return Promise.race([task, deadline]).finally(() => clearTimeout(timer))
}

import { Logger } from '@Voikyrioh/observability'
import type { Config } from './config'
import { migrate } from './data-access/database/migrate'
import { createPool } from './data-access/database/pool'
import { memoryRepositories } from './data-access/repository/memory/memory.repositories'
import {
	PgFollowRepository,
	PgOfferRepository,
	PgProductRepository,
	PgSearchCacheRepository,
	PgSessionRepository,
	PgShopHealthRepository,
	PgUserRepository,
} from './data-access/repository/pg/pg.repositories'
import { createRobot } from './data-access/scraping'
import { Argon2PasswordHasher } from './data-access/security/argon2-hasher'
import { sha256TokenService } from './data-access/security/session-tokens'
import { systemClock, ulidGenerator } from './data-access/system/system'
import type {
	FollowRepository,
	OfferRepository,
	ProductRepository,
	SearchCacheRepository,
	SessionRepository,
	ShopHealthRepository,
	UserRepository,
} from './domain/ports/repositories'
import type { Scraper, ShopCatalog } from './domain/ports/scraper'
import type { Clock, IdGenerator, PasswordHasher, TokenService } from './domain/ports/system'
import {
	DeleteAccountUseCase,
	LoginUseCase,
	RegisterUseCase,
} from './domain/usecases/account/account.usecases'
import { SessionService } from './domain/usecases/account/session-service'
import {
	FollowUseCase,
	ListFollowsUseCase,
	UnfollowUseCase,
} from './domain/usecases/follow/follow.usecases'
import { AddProductFromUrlUseCase } from './domain/usecases/product/add-product-from-url.usecase'
import { GetProductUseCase } from './domain/usecases/product/get-product.usecase'
import { ProductRefresher } from './domain/usecases/product/product-refresher'
import { RefreshProductUseCase } from './domain/usecases/product/refresh-product.usecase'
import { RefreshDueOffersUseCase } from './domain/usecases/refresh/refresh-due-offers.usecase'
import { SearchRuns } from './domain/usecases/search/search-runs'
import { GetSearchUseCase, StartSearchUseCase } from './domain/usecases/search/start-search.usecase'
import { OfferRecorder } from './domain/usecases/shared/offer-recorder'
import { ShopHealthRecorder } from './domain/usecases/shared/shop-health-recorder'
import { ListShopsUseCase } from './domain/usecases/shop/list-shops.usecase'

export interface Adapters {
	products: ProductRepository
	offers: OfferRepository
	users: UserRepository
	sessions: SessionRepository
	follows: FollowRepository
	health: ShopHealthRepository
	cache: SearchCacheRepository
	scraper: Scraper
	catalog: ShopCatalog
	clock: Clock
	ids: IdGenerator
	hasher: PasswordHasher
	tokens: TokenService
}

/** Use cases built on any set of adapters (production or tests). */
export function buildUseCases(a: Adapters, options: { shopTimeoutMs?: number } = {}) {
	const recorder = new OfferRecorder({
		offers: a.offers,
		products: a.products,
		clock: a.clock,
		ids: a.ids,
	})
	const health = new ShopHealthRecorder({ health: a.health, catalog: a.catalog, clock: a.clock })
	const refresher = new ProductRefresher({
		scraper: a.scraper,
		offers: a.offers,
		products: a.products,
		health,
		clock: a.clock,
	})
	const runs = new SearchRuns({ ...a, recorder, health, shopTimeoutMs: options.shopTimeoutMs })
	const sessions = new SessionService({
		sessions: a.sessions,
		users: a.users,
		tokens: a.tokens,
		clock: a.clock,
	})
	const account = { users: a.users, hasher: a.hasher, sessions, clock: a.clock, ids: a.ids }
	const productDeps = {
		products: a.products,
		offers: a.offers,
		follows: a.follows,
		catalog: a.catalog,
		refresher,
		clock: a.clock,
	}
	const followDeps = {
		follows: a.follows,
		products: a.products,
		offers: a.offers,
		catalog: a.catalog,
		clock: a.clock,
	}
	return {
		sessions,
		refresher,
		runs,
		startSearch: new StartSearchUseCase(runs),
		getSearch: new GetSearchUseCase(runs),
		addFromUrl: new AddProductFromUrlUseCase({ ...a, recorder, health }),
		getProduct: new GetProductUseCase(productDeps),
		refreshProduct: new RefreshProductUseCase(productDeps),
		refreshDue: new RefreshDueOffersUseCase({ offers: a.offers, refresher, clock: a.clock }),
		register: new RegisterUseCase(account),
		login: new LoginUseCase(account),
		deleteAccount: new DeleteAccountUseCase(account),
		follow: new FollowUseCase(followDeps),
		unfollow: new UnfollowUseCase(followDeps),
		listFollows: new ListFollowsUseCase(followDeps),
		listShops: new ListShopsUseCase({ catalog: a.catalog, health: a.health, clock: a.clock }),
	}
}

export type UseCases = ReturnType<typeof buildUseCases>

/** Composition root: the only place that picks the adapters of each port. */
export async function createContainer(config: Config) {
	const { scraper, catalog } = createRobot(config.robot)
	const system = {
		clock: systemClock,
		ids: ulidGenerator,
		hasher: new Argon2PasswordHasher(),
		tokens: sha256TokenService,
	}
	let dispose = async () => {}
	let housekeeping = async () => {}
	let repositories: Omit<Adapters, 'scraper' | 'catalog' | keyof typeof system>

	if (config.storage.kind === 'postgres') {
		const pool = createPool(config.storage.url, config.storage.poolMax)
		const applied = await migrate(pool, config.migrationsDir)
		if (applied.length) Logger.info({ applied }, 'Migrations applied')
		const sessions = new PgSessionRepository(pool)
		const cache = new PgSearchCacheRepository(pool)
		repositories = {
			products: new PgProductRepository(pool),
			offers: new PgOfferRepository(pool),
			users: new PgUserRepository(pool),
			sessions,
			follows: new PgFollowRepository(pool),
			health: new PgShopHealthRepository(pool),
			cache,
		}
		housekeeping = async () => {
			const now = systemClock.now()
			await sessions.purgeExpired(now)
			await cache.purge(new Date(now.getTime() - 24 * 3600_000))
		}
		dispose = () => pool.end()
	} else {
		Logger.warn('STORAGE=memory: everything is lost at restart')
		repositories = memoryRepositories()
	}

	const useCases = buildUseCases({ ...repositories, ...system, scraper, catalog })
	return { useCases, housekeeping, dispose }
}

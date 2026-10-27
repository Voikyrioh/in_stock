import { Offer } from '../../../domain/entities/offer'
import type { Product } from '../../../domain/entities/product'
import type { ShopHealth } from '../../../domain/entities/shop-health'
import type { Session, User } from '../../../domain/entities/user'
import type {
	FollowRepository,
	OfferRepository,
	ProductRepository,
	SearchCacheRepository,
	SessionRepository,
	ShopHealthRepository,
	UserRepository,
} from '../../../domain/ports/repositories'
import type { ScrapedOffer } from '../../../domain/ports/scraper'

/** In-memory storage: tests and STORAGE=memory (everything is lost at restart). */
export class MemoryStore {
	readonly products = new Map<string, Product>()
	readonly offers = new Map<string, Offer>()
	readonly snapshots: {
		offerId: string
		priceCents: number | null
		stock: string
		recordedAt: Date
	}[] = []
	readonly users = new Map<string, User>()
	readonly sessions = new Map<string, Session>()
	readonly follows = new Map<string, Date>() // `${userId}|${productId}`
	readonly health = new Map<string, ShopHealth>()
	readonly cache = new Map<string, { offers: ScrapedOffer[]; fetchedAt: Date }>()
}

export class MemoryProductRepository implements ProductRepository {
	constructor(private readonly store: MemoryStore) {}
	async findById(id: string) {
		return this.store.products.get(id) ?? null
	}
	async findByIds(ids: readonly string[]) {
		return ids.flatMap((id) => this.store.products.get(id) ?? [])
	}
	async findByGtin(gtin: string) {
		return [...this.store.products.values()].find((p) => p.gtin === gtin) ?? null
	}
	async findByBrandMpn(brand: string, mpn: string) {
		return (
			[...this.store.products.values()]
				.filter((p) => p.brand?.toLowerCase() === brand.toLowerCase() && p.mpn === mpn)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
		)
	}
	async save(product: Product) {
		if (product.gtin) {
			const owner = await this.findByGtin(product.gtin)
			if (owner && owner.id !== product.id) throw new Error('duplicate gtin')
		}
		this.store.products.set(product.id, product)
	}
}

export class MemoryOfferRepository implements OfferRepository {
	constructor(private readonly store: MemoryStore) {}
	private all() {
		return [...this.store.offers.values()].sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		)
	}
	async findById(id: string) {
		return this.store.offers.get(id) ?? null
	}
	async findByIds(ids: readonly string[]) {
		return ids.flatMap((id) => this.store.offers.get(id) ?? [])
	}
	async findByUrl(url: string) {
		return this.all().find((o) => o.url === url) ?? null
	}
	async listByProduct(productId: string) {
		return this.all().filter((o) => o.productId === productId)
	}
	async listByProducts(productIds: readonly string[]) {
		return this.all().filter((o) => productIds.includes(o.productId))
	}
	async save(offer: Offer, { snapshot }: { snapshot: boolean }) {
		const sameUrl = await this.findByUrl(offer.url)
		if (sameUrl && sameUrl.id !== offer.id) throw new Error('duplicate url')
		this.store.offers.set(offer.id, Offer.restore(offer.toJSON()))
		if (snapshot) {
			this.store.snapshots.push({
				offerId: offer.id,
				priceCents: offer.priceCents,
				stock: offer.stock,
				recordedAt: offer.lastCheckedAt ?? offer.createdAt,
			})
		}
	}
	async listDueFollowed(checkedBefore: Date, limit: number) {
		const followed = new Set([...this.store.follows.keys()].map((k) => k.split('|')[1]))
		return this.all()
			.filter(
				(o) => followed.has(o.productId) && (!o.lastCheckedAt || o.lastCheckedAt < checkedBefore),
			)
			.sort((a, b) => (a.lastCheckedAt?.getTime() ?? 0) - (b.lastCheckedAt?.getTime() ?? 0))
			.slice(0, limit)
	}
}

export class MemoryUserRepository implements UserRepository {
	constructor(private readonly store: MemoryStore) {}
	async findById(id: string) {
		return this.store.users.get(id) ?? null
	}
	async findByEmail(email: string) {
		return [...this.store.users.values()].find((u) => u.email === email) ?? null
	}
	async create(user: User) {
		if (await this.findByEmail(user.email)) return false
		this.store.users.set(user.id, user)
		return true
	}
	async delete(id: string) {
		this.store.users.delete(id)
		for (const [hash, s] of this.store.sessions)
			if (s.userId === id) this.store.sessions.delete(hash)
		for (const key of this.store.follows.keys())
			if (key.startsWith(`${id}|`)) this.store.follows.delete(key)
	}
}

export class MemorySessionRepository implements SessionRepository {
	constructor(private readonly store: MemoryStore) {}
	async create(session: Session) {
		this.store.sessions.set(session.tokenHash, { ...session })
	}
	async find(tokenHash: string) {
		const s = this.store.sessions.get(tokenHash)
		return s ? { ...s } : null
	}
	async extend(tokenHash: string, expiresAt: Date) {
		const s = this.store.sessions.get(tokenHash)
		if (s) s.expiresAt = expiresAt
	}
	async delete(tokenHash: string) {
		this.store.sessions.delete(tokenHash)
	}
}

export class MemoryFollowRepository implements FollowRepository {
	constructor(private readonly store: MemoryStore) {}
	async add(userId: string, productId: string, at: Date) {
		const key = `${userId}|${productId}`
		if (this.store.follows.has(key)) return false
		this.store.follows.set(key, at)
		return true
	}
	async remove(userId: string, productId: string) {
		this.store.follows.delete(`${userId}|${productId}`)
	}
	async count(userId: string) {
		return [...this.store.follows.keys()].filter((k) => k.startsWith(`${userId}|`)).length
	}
	async isFollowing(userId: string, productId: string) {
		return this.store.follows.has(`${userId}|${productId}`)
	}
	async list(userId: string) {
		return [...this.store.follows.entries()]
			.filter(([k]) => k.startsWith(`${userId}|`))
			.map(([k, followedAt]) => ({ productId: k.split('|')[1] as string, followedAt }))
			.sort((a, b) => b.followedAt.getTime() - a.followedAt.getTime())
	}
}

export class MemoryShopHealthRepository implements ShopHealthRepository {
	constructor(private readonly store: MemoryStore) {}
	async get(shopId: string) {
		return this.store.health.get(shopId) ?? null
	}
	async list() {
		return [...this.store.health.values()]
	}
	async save(health: ShopHealth) {
		this.store.health.set(health.shopId, health)
	}
}

export class MemorySearchCacheRepository implements SearchCacheRepository {
	constructor(private readonly store: MemoryStore) {}
	async get(queryKey: string, shopId: string, newerThan: Date) {
		const entry = this.store.cache.get(`${queryKey}|${shopId}`)
		return entry && entry.fetchedAt > newerThan ? entry : null
	}
	async put(queryKey: string, shopId: string, offers: ScrapedOffer[], fetchedAt: Date) {
		this.store.cache.set(`${queryKey}|${shopId}`, { offers, fetchedAt })
	}
}

export function memoryRepositories(store = new MemoryStore()) {
	return {
		store,
		products: new MemoryProductRepository(store),
		offers: new MemoryOfferRepository(store),
		users: new MemoryUserRepository(store),
		sessions: new MemorySessionRepository(store),
		follows: new MemoryFollowRepository(store),
		health: new MemoryShopHealthRepository(store),
		cache: new MemorySearchCacheRepository(store),
	}
}

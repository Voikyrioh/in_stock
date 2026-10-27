import type { Offer } from '../entities/offer'
import type { Product } from '../entities/product'
import type { ShopHealth } from '../entities/shop-health'
import type { Session, User } from '../entities/user'
import type { ScrapedOffer } from './scraper'

export interface ProductRepository {
	findById(id: string): Promise<Product | null>
	findByIds(ids: readonly string[]): Promise<Product[]>
	findByGtin(gtin: string): Promise<Product | null>
	findByBrandMpn(brand: string, mpn: string): Promise<Product | null>
	save(product: Product): Promise<void>
}

export interface OfferRepository {
	findById(id: string): Promise<Offer | null>
	findByIds(ids: readonly string[]): Promise<Offer[]>
	findByUrl(url: string): Promise<Offer | null>
	listByProduct(productId: string): Promise<Offer[]>
	listByProducts(productIds: readonly string[]): Promise<Offer[]>
	/** Saves the offer; with `snapshot` the new price/stock is also kept in its history (BR-OFFER-001). */
	save(offer: Offer, options: { snapshot: boolean }): Promise<void>
	/** Offers of followed products whose last check is older than `checkedBefore`, oldest first. */
	listDueFollowed(checkedBefore: Date, limit: number): Promise<Offer[]>
}

export interface UserRepository {
	findById(id: string): Promise<User | null>
	findByEmail(email: string): Promise<User | null>
	/** False when the email is already taken (BR-ACCOUNT-001). */
	create(user: User): Promise<boolean>
	/** Deletes the account with its sessions and follows (BR-ACCOUNT-006). */
	delete(id: string): Promise<void>
}

export interface SessionRepository {
	create(session: Session): Promise<void>
	find(tokenHash: string): Promise<Session | null>
	extend(tokenHash: string, expiresAt: Date): Promise<void>
	delete(tokenHash: string): Promise<void>
}

export interface FollowRepository {
	/** Idempotent: false when it was already followed. */
	add(userId: string, productId: string, at: Date): Promise<boolean>
	remove(userId: string, productId: string): Promise<void>
	count(userId: string): Promise<number>
	isFollowing(userId: string, productId: string): Promise<boolean>
	list(userId: string): Promise<{ productId: string; followedAt: Date }[]>
}

export interface ShopHealthRepository {
	get(shopId: string): Promise<ShopHealth | null>
	list(): Promise<ShopHealth[]>
	save(health: ShopHealth): Promise<void>
}

export interface SearchCacheRepository {
	/** Readings of a shop for a query, if fetched after `newerThan` (BR-SEARCH-003). */
	get(
		queryKey: string,
		shopId: string,
		newerThan: Date,
	): Promise<{ offers: ScrapedOffer[]; fetchedAt: Date } | null>
	put(queryKey: string, shopId: string, offers: ScrapedOffer[], fetchedAt: Date): Promise<void>
}

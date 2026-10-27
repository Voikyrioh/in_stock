import type { StockState } from '@in-stock/shared'
import type pg from 'pg'
import { Offer } from '../../../domain/entities/offer'
import { Product } from '../../../domain/entities/product'
import { ShopHealth } from '../../../domain/entities/shop-health'
import { type Session, User } from '../../../domain/entities/user'
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

/** Parameterised SQL only (ADR-0008). Rows are converted to entities here, nowhere else. */

interface ProductRow {
	id: string
	name: string
	brand: string | null
	gtin: string | null
	mpn: string | null
	image_url: string | null
	created_at: Date
	updated_at: Date
}

const toProduct = (r: ProductRow) =>
	Product.restore({
		id: r.id,
		name: r.name,
		brand: r.brand,
		gtin: r.gtin,
		mpn: r.mpn,
		imageUrl: r.image_url,
		createdAt: r.created_at,
		updatedAt: r.updated_at,
	})

export class PgProductRepository implements ProductRepository {
	constructor(private readonly pool: pg.Pool) {}

	async findById(id: string) {
		const { rows } = await this.pool.query<ProductRow>('SELECT * FROM products WHERE id = $1', [id])
		return rows[0] ? toProduct(rows[0]) : null
	}

	async findByIds(ids: readonly string[]) {
		if (ids.length === 0) return []
		const { rows } = await this.pool.query<ProductRow>(
			'SELECT * FROM products WHERE id = ANY($1::text[])',
			[ids],
		)
		return rows.map(toProduct)
	}

	async findByGtin(gtin: string) {
		const { rows } = await this.pool.query<ProductRow>('SELECT * FROM products WHERE gtin = $1', [
			gtin,
		])
		return rows[0] ? toProduct(rows[0]) : null
	}

	async findByBrandMpn(brand: string, mpn: string) {
		const { rows } = await this.pool.query<ProductRow>(
			'SELECT * FROM products WHERE lower(brand) = lower($1) AND mpn = $2 ORDER BY created_at LIMIT 1',
			[brand, mpn],
		)
		return rows[0] ? toProduct(rows[0]) : null
	}

	async save(product: Product) {
		const p = product.toJSON()
		await this.pool.query(
			`INSERT INTO products (id, name, brand, gtin, mpn, image_url, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT (id) DO UPDATE SET name = $2, brand = $3, gtin = $4, mpn = $5, image_url = $6, updated_at = $8`,
			[p.id, p.name, p.brand, p.gtin, p.mpn, p.imageUrl, p.createdAt, p.updatedAt],
		)
	}
}

interface OfferRow {
	id: string
	product_id: string
	shop_id: string
	url: string
	title: string
	price_cents: number | null
	currency: string
	stock: StockState
	last_checked_at: Date | null
	last_success_at: Date | null
	last_error: string | null
	created_at: Date
}

const toOffer = (r: OfferRow) =>
	Offer.restore({
		id: r.id,
		productId: r.product_id,
		shopId: r.shop_id,
		url: r.url,
		title: r.title,
		priceCents: r.price_cents,
		currency: r.currency.trim(),
		stock: r.stock,
		lastCheckedAt: r.last_checked_at,
		lastSuccessAt: r.last_success_at,
		lastError: r.last_error,
		createdAt: r.created_at,
	})

export class PgOfferRepository implements OfferRepository {
	constructor(private readonly pool: pg.Pool) {}

	async findById(id: string) {
		const { rows } = await this.pool.query<OfferRow>('SELECT * FROM offers WHERE id = $1', [id])
		return rows[0] ? toOffer(rows[0]) : null
	}

	async findByIds(ids: readonly string[]) {
		if (ids.length === 0) return []
		const { rows } = await this.pool.query<OfferRow>(
			'SELECT * FROM offers WHERE id = ANY($1::text[])',
			[ids],
		)
		return rows.map(toOffer)
	}

	async findByUrl(url: string) {
		const { rows } = await this.pool.query<OfferRow>('SELECT * FROM offers WHERE url = $1', [url])
		return rows[0] ? toOffer(rows[0]) : null
	}

	async listByProduct(productId: string) {
		const { rows } = await this.pool.query<OfferRow>(
			'SELECT * FROM offers WHERE product_id = $1 ORDER BY created_at',
			[productId],
		)
		return rows.map(toOffer)
	}

	async listByProducts(productIds: readonly string[]) {
		if (productIds.length === 0) return []
		const { rows } = await this.pool.query<OfferRow>(
			'SELECT * FROM offers WHERE product_id = ANY($1::text[]) ORDER BY created_at',
			[productIds],
		)
		return rows.map(toOffer)
	}

	async save(offer: Offer, { snapshot }: { snapshot: boolean }) {
		const o = offer.toJSON()
		const client = await this.pool.connect()
		try {
			await client.query('BEGIN')
			await client.query(
				`INSERT INTO offers (id, product_id, shop_id, url, title, price_cents, currency, stock,
					last_checked_at, last_success_at, last_error, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				 ON CONFLICT (id) DO UPDATE SET title = $5, price_cents = $6, currency = $7, stock = $8,
					last_checked_at = $9, last_success_at = $10, last_error = $11`,
				[
					o.id,
					o.productId,
					o.shopId,
					o.url,
					o.title,
					o.priceCents,
					o.currency,
					o.stock,
					o.lastCheckedAt,
					o.lastSuccessAt,
					o.lastError,
					o.createdAt,
				],
			)
			if (snapshot) {
				await client.query(
					'INSERT INTO offer_snapshots (offer_id, price_cents, currency, stock, recorded_at) VALUES ($1, $2, $3, $4, $5)',
					[o.id, o.priceCents, o.currency, o.stock, o.lastCheckedAt ?? o.createdAt],
				)
			}
			await client.query('COMMIT')
		} catch (error) {
			await client.query('ROLLBACK')
			throw error
		} finally {
			client.release()
		}
	}

	async listDueFollowed(checkedBefore: Date, limit: number) {
		const { rows } = await this.pool.query<OfferRow>(
			`SELECT o.* FROM offers o
			 WHERE EXISTS (SELECT 1 FROM follows f WHERE f.product_id = o.product_id)
			   AND (o.last_checked_at IS NULL OR o.last_checked_at < $1)
			 ORDER BY o.last_checked_at NULLS FIRST
			 LIMIT $2`,
			[checkedBefore, limit],
		)
		return rows.map(toOffer)
	}
}

/** Snapshots for tests and the future price curves. */
export async function listSnapshots(pool: pg.Pool, offerId: string) {
	const { rows } = await pool.query<{
		price_cents: number | null
		stock: string
		recorded_at: Date
	}>(
		'SELECT price_cents, stock, recorded_at FROM offer_snapshots WHERE offer_id = $1 ORDER BY id',
		[offerId],
	)
	return rows
}

interface UserRow {
	id: string
	email: string
	password_hash: string
	created_at: Date
}

const toUser = (r: UserRow) =>
	User.restore({ id: r.id, email: r.email, passwordHash: r.password_hash, createdAt: r.created_at })

export class PgUserRepository implements UserRepository {
	constructor(private readonly pool: pg.Pool) {}

	async findById(id: string) {
		const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id])
		return rows[0] ? toUser(rows[0]) : null
	}

	async findByEmail(email: string) {
		const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email])
		return rows[0] ? toUser(rows[0]) : null
	}

	async create(user: User) {
		const { rowCount } = await this.pool.query(
			`INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)
			 ON CONFLICT (email) DO NOTHING`,
			[user.id, user.email, user.passwordHash, user.createdAt],
		)
		return rowCount === 1
	}

	async delete(id: string) {
		// Sessions and follows go with it (ON DELETE CASCADE).
		await this.pool.query('DELETE FROM users WHERE id = $1', [id])
	}
}

export class PgSessionRepository implements SessionRepository {
	constructor(private readonly pool: pg.Pool) {}

	async create(s: Session) {
		await this.pool.query(
			'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)',
			[s.tokenHash, s.userId, s.createdAt, s.expiresAt],
		)
	}

	async find(tokenHash: string) {
		const { rows } = await this.pool.query<{
			token_hash: string
			user_id: string
			created_at: Date
			expires_at: Date
		}>('SELECT * FROM sessions WHERE token_hash = $1', [tokenHash])
		const r = rows[0]
		return r
			? {
					tokenHash: r.token_hash,
					userId: r.user_id,
					createdAt: r.created_at,
					expiresAt: r.expires_at,
				}
			: null
	}

	async extend(tokenHash: string, expiresAt: Date) {
		await this.pool.query('UPDATE sessions SET expires_at = $2 WHERE token_hash = $1', [
			tokenHash,
			expiresAt,
		])
	}

	async delete(tokenHash: string) {
		await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash])
	}

	/** Housekeeping: expired sessions. */
	async purgeExpired(now: Date) {
		await this.pool.query('DELETE FROM sessions WHERE expires_at <= $1', [now])
	}
}

export class PgFollowRepository implements FollowRepository {
	constructor(private readonly pool: pg.Pool) {}

	async add(userId: string, productId: string, at: Date) {
		const { rowCount } = await this.pool.query(
			'INSERT INTO follows (user_id, product_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
			[userId, productId, at],
		)
		return rowCount === 1
	}

	async remove(userId: string, productId: string) {
		await this.pool.query('DELETE FROM follows WHERE user_id = $1 AND product_id = $2', [
			userId,
			productId,
		])
	}

	async count(userId: string) {
		const { rows } = await this.pool.query<{ n: string }>(
			'SELECT count(*) AS n FROM follows WHERE user_id = $1',
			[userId],
		)
		return Number(rows[0]?.n ?? 0)
	}

	async isFollowing(userId: string, productId: string) {
		const { rowCount } = await this.pool.query(
			'SELECT 1 FROM follows WHERE user_id = $1 AND product_id = $2',
			[userId, productId],
		)
		return (rowCount ?? 0) > 0
	}

	async list(userId: string) {
		const { rows } = await this.pool.query<{ product_id: string; created_at: Date }>(
			'SELECT product_id, created_at FROM follows WHERE user_id = $1 ORDER BY created_at DESC',
			[userId],
		)
		return rows.map((r) => ({ productId: r.product_id, followedAt: r.created_at }))
	}
}

interface HealthRow {
	shop_id: string
	last_success_at: Date | null
	last_failure_at: Date | null
	last_error: string | null
	consecutive_failures: number
	paused_until: Date | null
	robots_forbidden: boolean
}

const toHealth = (r: HealthRow) =>
	ShopHealth.restore({
		shopId: r.shop_id,
		lastSuccessAt: r.last_success_at,
		lastFailureAt: r.last_failure_at,
		lastError: r.last_error,
		consecutiveFailures: r.consecutive_failures,
		pausedUntil: r.paused_until,
		robotsForbidden: r.robots_forbidden,
	})

export class PgShopHealthRepository implements ShopHealthRepository {
	constructor(private readonly pool: pg.Pool) {}

	async get(shopId: string) {
		const { rows } = await this.pool.query<HealthRow>(
			'SELECT * FROM shop_health WHERE shop_id = $1',
			[shopId],
		)
		return rows[0] ? toHealth(rows[0]) : null
	}

	async list() {
		const { rows } = await this.pool.query<HealthRow>('SELECT * FROM shop_health')
		return rows.map(toHealth)
	}

	async save(health: ShopHealth) {
		const h = health.toJSON()
		await this.pool.query(
			`INSERT INTO shop_health (shop_id, last_success_at, last_failure_at, last_error, consecutive_failures, paused_until, robots_forbidden)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (shop_id) DO UPDATE SET last_success_at = $2, last_failure_at = $3, last_error = $4,
				consecutive_failures = $5, paused_until = $6, robots_forbidden = $7`,
			[
				h.shopId,
				h.lastSuccessAt,
				h.lastFailureAt,
				h.lastError,
				h.consecutiveFailures,
				h.pausedUntil,
				h.robotsForbidden,
			],
		)
	}
}

export class PgSearchCacheRepository implements SearchCacheRepository {
	constructor(private readonly pool: pg.Pool) {}

	async get(queryKey: string, shopId: string, newerThan: Date) {
		const { rows } = await this.pool.query<{ offers: ScrapedOffer[]; fetched_at: Date }>(
			'SELECT offers, fetched_at FROM search_cache WHERE query_key = $1 AND shop_id = $2 AND fetched_at > $3',
			[queryKey, shopId, newerThan],
		)
		const r = rows[0]
		return r ? { offers: r.offers, fetchedAt: r.fetched_at } : null
	}

	async put(queryKey: string, shopId: string, offers: ScrapedOffer[], fetchedAt: Date) {
		await this.pool.query(
			`INSERT INTO search_cache (query_key, shop_id, offers, fetched_at) VALUES ($1, $2, $3::jsonb, $4)
			 ON CONFLICT (query_key, shop_id) DO UPDATE SET offers = $3::jsonb, fetched_at = $4`,
			[queryKey, shopId, JSON.stringify(offers), fetchedAt],
		)
	}

	/** Housekeeping: entries older than a day are useless (15 min reuse). */
	async purge(olderThan: Date) {
		await this.pool.query('DELETE FROM search_cache WHERE fetched_at < $1', [olderThan])
	}
}

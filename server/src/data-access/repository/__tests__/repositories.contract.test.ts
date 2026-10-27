import { expect } from 'chai'
import pg from 'pg'
import { ulid } from 'ulid'
import { Offer } from '../../../domain/entities/offer'
import { Product } from '../../../domain/entities/product'
import { ShopHealth } from '../../../domain/entities/shop-health'
import { User } from '../../../domain/entities/user'
import type {
	FollowRepository,
	OfferRepository,
	ProductRepository,
	SearchCacheRepository,
	SessionRepository,
	ShopHealthRepository,
	UserRepository,
} from '../../../domain/ports/repositories'
import { migrate } from '../../database/migrate'
import { memoryRepositories } from '../memory/memory.repositories'
import {
	listSnapshots,
	PgFollowRepository,
	PgOfferRepository,
	PgProductRepository,
	PgSearchCacheRepository,
	PgSessionRepository,
	PgShopHealthRepository,
	PgUserRepository,
} from '../pg/pg.repositories'

/**
 * Memory and Postgres repositories pass the same contract. The Postgres run
 * needs TEST_DATABASE_URL (CI service, or a local database).
 */
interface Repos {
	products: ProductRepository
	offers: OfferRepository
	users: UserRepository
	sessions: SessionRepository
	follows: FollowRepository
	health: ShopHealthRepository
	cache: SearchCacheRepository
}

function contract(
	name: string,
	make: () => Promise<{
		repos: Repos
		snapshots: (id: string) => Promise<unknown[]>
	}>,
) {
	describe(`Repository contract: ${name}`, () => {
		const now = new Date('2026-10-27T12:00:00Z')
		let r: Repos
		let snapshots: (id: string) => Promise<unknown[]>
		beforeEach(async () => {
			;({ repos: r, snapshots } = await make())
		})

		const product = (fields: Partial<Parameters<typeof Product.create>[0]> = {}) =>
			Product.create(
				{
					id: ulid(),
					name: 'RTX 4070',
					brand: 'MSI',
					gtin: null,
					mpn: null,
					imageUrl: null,
					...fields,
				},
				now,
			)

		it('stores products and finds them by GTIN and brand + reference', async () => {
			const a = product({ gtin: '04711377157834' })
			const b = product({ mpn: '912-V513-618' })
			await r.products.save(a)
			await r.products.save(b)
			expect((await r.products.findByGtin('04711377157834'))?.id).to.equal(a.id)
			expect((await r.products.findByBrandMpn('msi', '912-V513-618'))?.id).to.equal(b.id)
			expect(
				(await r.products.findByIds([a.id, b.id, 'none'])).map((p) => p.id).sort(),
			).to.deep.equal([a.id, b.id].sort())
		})

		it('stores offers, snapshots on demand, and lists due followed offers', async () => {
			const p = product()
			await r.products.save(p)
			const offer = Offer.create(
				{
					id: ulid(),
					productId: p.id,
					shopId: 'ldlc',
					url: `https://www.ldlc.com/fiche/${ulid()}.html`,
					title: 'RTX',
					priceCents: 59995,
					currency: 'EUR',
					stock: 'in_stock',
				},
				now,
			)
			await r.offers.save(offer, { snapshot: true })
			const { offer: next } = offer.withReading(
				{ title: 'RTX', priceCents: 54995, currency: 'EUR', stock: 'limited' },
				new Date(now.getTime() + 1000),
			)
			await r.offers.save(next, { snapshot: true })
			await r.offers.save(next.withFailure('timeout', new Date(now.getTime() + 2000)), {
				snapshot: false,
			})
			const stored = await r.offers.findByUrl(offer.url)
			expect(stored).to.include({
				priceCents: 54995,
				stock: 'limited',
				lastError: 'timeout',
				stale: true,
			})
			expect(await snapshots(offer.id)).to.have.length(2)
			expect((await r.offers.listByProduct(p.id)).map((o) => o.id)).to.deep.equal([offer.id])

			const later = new Date(now.getTime() + 3600_000)
			expect(await r.offers.listDueFollowed(later, 10)).to.have.length(0)
			const user = User.restore({
				id: ulid(),
				email: `${ulid().toLowerCase()}@exemple.fr`,
				passwordHash: 'x'.repeat(30),
				createdAt: now,
			})
			await r.users.create(user)
			await r.follows.add(user.id, p.id, now)
			expect((await r.offers.listDueFollowed(later, 10)).map((o) => o.id)).to.deep.equal([offer.id])
		})

		it('keeps emails unique and deletes accounts with their sessions and follows', async () => {
			const email = `${ulid().toLowerCase()}@exemple.fr`
			const user = User.restore({ id: ulid(), email, passwordHash: 'x'.repeat(30), createdAt: now })
			expect(await r.users.create(user)).to.equal(true)
			expect(
				await r.users.create(
					User.restore({ id: ulid(), email, passwordHash: 'y'.repeat(30), createdAt: now }),
				),
			).to.equal(false)
			const p = product()
			await r.products.save(p)
			expect(await r.follows.add(user.id, p.id, now)).to.equal(true)
			expect(await r.follows.add(user.id, p.id, now)).to.equal(false)
			expect(await r.follows.count(user.id)).to.equal(1)
			await r.sessions.create({
				tokenHash: ulid(),
				userId: user.id,
				createdAt: now,
				expiresAt: now,
			})
			await r.users.delete(user.id)
			expect(await r.users.findByEmail(email)).to.equal(null)
			expect(await r.follows.count(user.id)).to.equal(0)
		})

		it('stores sessions', async () => {
			const user = User.restore({
				id: ulid(),
				email: `${ulid().toLowerCase()}@exemple.fr`,
				passwordHash: 'x'.repeat(30),
				createdAt: now,
			})
			await r.users.create(user)
			const tokenHash = ulid()
			await r.sessions.create({ tokenHash, userId: user.id, createdAt: now, expiresAt: now })
			const later = new Date(now.getTime() + 1000)
			await r.sessions.extend(tokenHash, later)
			expect((await r.sessions.find(tokenHash))?.expiresAt.getTime()).to.equal(later.getTime())
			await r.sessions.delete(tokenHash)
			expect(await r.sessions.find(tokenHash)).to.equal(null)
		})

		it('stores shop health and the search cache', async () => {
			const id = `shop-${ulid()}`
			await r.health.save(
				ShopHealth.empty(id).failed('blocked', now, new Date(now.getTime() + 60_000)),
			)
			expect((await r.health.get(id))?.facts()).to.include({ consecutiveFailures: 1 })
			const key = `q-${ulid()}`
			await r.cache.put(key, 'ldlc', [], now)
			expect(await r.cache.get(key, 'ldlc', new Date(now.getTime() - 1))).to.deep.include({
				offers: [],
			})
			expect(await r.cache.get(key, 'ldlc', now)).to.equal(null)
		})
	})
}

contract('memory', async () => {
	const repos = memoryRepositories()
	return {
		repos,
		snapshots: async (id) => repos.store.snapshots.filter((s) => s.offerId === id),
	}
})

const url = process.env.TEST_DATABASE_URL
if (url) {
	let pool: pg.Pool
	before(async () => {
		pool = new pg.Pool({ connectionString: url, max: 4 })
		await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public')
		await migrate(pool, 'migrations')
		expect(await migrate(pool, 'migrations'), 'idempotent').to.deep.equal([])
	})
	after(() => pool.end())
	contract('postgres', async () => ({
		repos: {
			products: new PgProductRepository(pool),
			offers: new PgOfferRepository(pool),
			users: new PgUserRepository(pool),
			sessions: new PgSessionRepository(pool),
			follows: new PgFollowRepository(pool),
			health: new PgShopHealthRepository(pool),
			cache: new PgSearchCacheRepository(pool),
		},
		snapshots: (id) => listSnapshots(pool, id),
	}))
}

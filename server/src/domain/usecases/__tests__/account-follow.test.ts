import type { FunctionalError } from '@Voikyrioh/observability'
import { LIMITS } from '@in-stock/shared'
import { expect } from 'chai'
import { reading, testWorld } from '../../../__tests__/support/fakes'
import { Argon2PasswordHasher } from '../../../data-access/security/argon2-hasher'

const credentials = { email: ' Voiky@Exemple.fr ', password: 'une phrase longue' }

describe('us-creer-un-compte', () => {
	it('should register, then log in with any email case', async () => {
		const { uc } = testWorld()
		const registered = await uc.register.Execute(credentials)
		expect(registered.user.email).to.equal('voiky@exemple.fr')
		const logged = await uc.login.Execute({
			email: 'VOIKY@exemple.fr',
			password: 'une phrase longue',
		})
		expect(logged.user.id).to.equal(registered.user.id)
		expect((await uc.sessions.authenticate(logged.token))?.user.id).to.equal(registered.user.id)
	})

	it('should refuse a taken email (BR-ACCOUNT-001)', async () => {
		const { uc } = testWorld()
		await uc.register.Execute(credentials)
		const error = (await uc.register
			.Execute({ ...credentials, email: 'voiky@exemple.fr' })
			.catch((e: unknown) => e)) as FunctionalError
		expect([error.code, error.reason]).to.deep.equal(['conflict', 'email-taken'])
	})

	it('should validate email and password (BR-ACCOUNT-002)', async () => {
		const { uc } = testWorld()
		const bad = (await uc.register
			.Execute({ email: 'voiky', password: 'motdepasse12' })
			.catch((e: unknown) => e)) as FunctionalError
		expect(bad.code).to.equal('invalid-payload')
		const short = (await uc.register
			.Execute({ email: 'a@b.fr', password: 'court' })
			.catch((e: unknown) => e)) as FunctionalError
		expect((short.details as { field: string }[])[0]?.field).to.equal('password')
	})

	it('should answer the same for unknown email and wrong password (BR-ACCOUNT-003)', async () => {
		const { uc } = testWorld()
		await uc.register.Execute(credentials)
		for (const attempt of [
			{ email: 'nobody@exemple.fr', password: 'whatever123' },
			{ email: 'voiky@exemple.fr', password: 'mauvais mot de passe' },
		]) {
			const error = (await uc.login.Execute(attempt).catch((e: unknown) => e)) as FunctionalError
			expect([error.code, error.reason]).to.deep.equal(['unauthorized', 'bad-credentials'])
		}
	})

	it('should expire sessions after 30 days and close them on logout (BR-ACCOUNT-005)', async () => {
		const { uc, clock } = testWorld()
		const { token } = await uc.register.Execute(credentials)
		clock.advance(29 * 24 * 3600_000)
		expect(await uc.sessions.authenticate(token)).to.not.equal(null)
		clock.advance(29 * 24 * 3600_000)
		expect(await uc.sessions.authenticate(token), 'sliding expiry').to.not.equal(null)
		clock.advance(31 * 24 * 3600_000)
		expect(await uc.sessions.authenticate(token)).to.equal(null)

		const second = await uc.login.Execute(credentials)
		await uc.sessions.close(second.token)
		expect(await uc.sessions.authenticate(second.token)).to.equal(null)
	})

	it('should delete the account with its follows and sessions (BR-ACCOUNT-006)', async () => {
		const { uc, repos, scraper } = testWorld()
		const { user, token } = await uc.register.Execute(credentials)
		const url = 'https://www.ldlc.com/fiche/PB1.html'
		scraper.pages.set(url, reading(url))
		const { productId } = await uc.addFromUrl.Execute(url)
		await uc.follow.Execute(user.id, productId)
		const entity = await repos.users.findById(user.id)
		if (!entity) throw new Error('user not stored')
		const wrong = (await uc.deleteAccount
			.Execute(entity, 'mauvais')
			.catch((e: unknown) => e)) as FunctionalError
		expect(wrong.reason).to.equal('bad-password')
		await uc.deleteAccount.Execute(entity, credentials.password)
		expect(await repos.users.findById(user.id)).to.equal(null)
		expect(repos.store.follows.size).to.equal(0)
		expect(await uc.sessions.authenticate(token)).to.equal(null)
	})

	it('should hash with argon2id', async function () {
		this.timeout(20_000)
		const hasher = new Argon2PasswordHasher()
		const hash = await hasher.hash('une phrase longue')
		expect(hash).to.match(/^\$argon2id\$/)
		expect(await hasher.verify(hash, 'une phrase longue')).to.equal(true)
		expect(await hasher.verify(hash, 'autre')).to.equal(false)
		expect(await hasher.verify('garbage', 'autre')).to.equal(false)
	})
})

describe('us-suivre-un-produit', () => {
	async function world() {
		const w = testWorld()
		const { user } = await w.uc.register.Execute(credentials)
		const add = async (n: number, fields = {}) => {
			const url = `https://www.ldlc.com/fiche/PB${n}.html`
			w.scraper.pages.set(url, reading(url, { title: `Produit ${n}`, ...fields }))
			return (await w.uc.addFromUrl.Execute(url)).productId
		}
		return { ...w, userId: user.id, add }
	}

	it('should follow once and list follows with their best state (BR-FOLLOW-001/004)', async () => {
		const { uc, userId, add, clock } = await world()
		const cheap = await add(1, { priceCents: 10000 })
		const out = await add(2, { stock: 'out_of_stock' })
		const pricey = await add(3, { priceCents: 90000 })
		for (const id of [out, pricey, cheap, cheap]) {
			await uc.follow.Execute(userId, id)
			clock.advance(1000)
		}
		const list = await uc.listFollows.Execute(userId)
		expect(list.map((f) => f.product.id)).to.deep.equal([cheap, pricey, out])
		expect(list[0]).to.include({ inStockCount: 1 })
		expect(list[2]?.bestOffer).to.equal(null)
		await uc.unfollow.Execute(userId, cheap)
		await uc.unfollow.Execute(userId, cheap)
		expect(await uc.listFollows.Execute(userId)).to.have.length(2)
	})

	it('should cap follows at 100 (BR-FOLLOW-002)', async () => {
		const { uc, userId, add, repos } = await world()
		const last = await add(1)
		for (let i = 0; i < LIMITS.followsMax; i++) await repos.follows.add(userId, `P${i}`, new Date())
		const error = (await uc.follow
			.Execute(userId, last)
			.catch((e: unknown) => e)) as FunctionalError
		expect([error.code, error.reason]).to.deep.equal(['conflict', 'follow-limit'])
	})

	it('should read followed offers older than 30 minutes (BR-FOLLOW-003)', async () => {
		const { uc, userId, add, clock, scraper } = await world()
		const followed = await add(1)
		await add(2)
		await uc.follow.Execute(userId, followed)
		expect(await uc.refreshDue.Execute()).to.equal(0)
		clock.advance(31 * 60_000)
		scraper.readCalls = []
		scraper.readTriggers = []
		expect(await uc.refreshDue.Execute()).to.equal(1)
		expect(scraper.readCalls).to.deep.equal(['https://www.ldlc.com/fiche/PB1.html'])
		// BR-SCRAPE-001: the scheduler is a crawler, robots.txt applies in full.
		expect(scraper.readTriggers.at(-1)).to.equal('schedule')
		expect(await uc.refreshDue.Execute()).to.equal(0)
	})
})

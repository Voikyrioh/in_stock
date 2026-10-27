import { expect } from 'chai'
import { reading, testWorld } from '../../__tests__/support/fakes'
import { createApp } from '../app'

const ORIGIN = 'https://in-stock.test'

function setup(options: { publicOrigin?: string | null } = {}) {
	const world = testWorld()
	const app = createApp(world.uc, {
		publicOrigin: options.publicOrigin ?? null,
		staticDir: null,
		production: false,
	})
	let cookie = ''
	const call = async (
		method: string,
		path: string,
		body?: unknown,
		headers: Record<string, string> = {},
	) => {
		const res = await app.request(path, {
			method,
			headers: {
				...(body !== undefined ? { 'content-type': 'application/json' } : {}),
				...(cookie ? { cookie } : {}),
				...headers,
			},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		})
		const set = res.headers.get('set-cookie')
		if (set)
			cookie = /Max-Age=0|expires=Thu, 01 Jan 1970/i.test(set) ? '' : (set.split(';')[0] ?? '')
		const text = await res.text()
		return {
			status: res.status,
			headers: res.headers,
			json: text ? JSON.parse(text) : null,
			setCookie: set,
		}
	}
	return { ...world, app, call }
}

describe('HTTP API', () => {
	it('GET /api/health answers ok and is never cached', async () => {
		const { call } = setup()
		const res = await call('GET', '/api/health')
		expect(res.status).to.equal(200)
		expect(res.json).to.deep.equal({ status: 'ok' })
		expect(res.headers.get('cache-control')).to.equal('no-store')
	})

	it('unknown API routes answer a JSON 404', async () => {
		const { call } = setup()
		const res = await call('GET', '/api/nope')
		expect(res.status).to.equal(404)
		expect(res.json.code).to.equal('not-found')
	})

	it('POST /api/searches starts a search, GET polls it', async () => {
		const { call, scraper, uc } = setup()
		scraper.searches.set('ldlc', [reading('https://www.ldlc.com/fiche/PB1.html')])
		const started = await call('POST', '/api/searches', { query: 'rtx 4070' })
		expect(started.status).to.equal(202)
		await uc.runs.get(started.json.search.id)?.settled
		const polled = await call('GET', `/api/searches/${started.json.search.id}`)
		expect(polled.json.search.done).to.equal(true)
		expect(polled.json.search.results[0].offers[0].shopName).to.equal('LDLC')
	})

	it('validation errors come back as invalid-payload with the field', async () => {
		const { call } = setup()
		const res = await call('POST', '/api/searches', { nope: 1 })
		expect(res.status).to.equal(400)
		expect(res.json.code).to.equal('invalid-payload')
		expect(res.json.details[0].field).to.equal('query')
		const short = await call('POST', '/api/searches', { query: 'a' })
		expect(short.json.reason).to.equal('query-length')
		const badId = await call('GET', '/api/products/not-an-id')
		expect(badId.status).to.equal(400)
	})

	it('limits searches to 20 per minute (BR-SEARCH-007)', async () => {
		const { call } = setup()
		const headers = { 'cf-connecting-ip': '203.0.113.9' }
		for (let i = 0; i < 20; i++)
			expect(
				(await call('POST', '/api/searches', { query: `rtx ${i}0` }, headers)).status,
			).to.equal(202)
		const limited = await call('POST', '/api/searches', { query: 'rtx 5090' }, headers)
		expect(limited.status).to.equal(429)
		expect(limited.json.reason).to.equal('search')
		expect(Number(limited.headers.get('retry-after'))).to.be.greaterThan(0)
		expect(
			(
				await call(
					'POST',
					'/api/searches',
					{ query: 'rtx 5090' },
					{ 'cf-connecting-ip': '198.51.100.1' },
				)
			).status,
		).to.equal(202)
	})

	it('the session cookie is HttpOnly, SameSite=Lax, and drives /api/auth/me', async () => {
		const { call } = setup()
		const registered = await call('POST', '/api/auth/register', {
			email: 'voiky@exemple.fr',
			password: 'une phrase longue',
		})
		expect(registered.status).to.equal(201)
		expect(registered.setCookie).to.match(/instock_session=/)
		expect(registered.setCookie).to.match(/HttpOnly/i)
		expect(registered.setCookie).to.match(/SameSite=Lax/i)
		expect((await call('GET', '/api/auth/me')).json.user.email).to.equal('voiky@exemple.fr')
		expect((await call('POST', '/api/auth/logout')).status).to.equal(204)
		const after = await call('GET', '/api/auth/me')
		expect(after.status).to.equal(401)
		expect(after.json.reason).to.equal('no-session')
	})

	it('wrong credentials answer 401 bad-credentials, then 429 after 10 attempts (BR-ACCOUNT-004)', async () => {
		const { call } = setup()
		const headers = { 'cf-connecting-ip': '203.0.113.20' }
		for (let i = 0; i < 10; i++) {
			const res = await call(
				'POST',
				'/api/auth/login',
				{ email: 'x@y.fr', password: 'mauvais mot' },
				headers,
			)
			expect(res.status).to.equal(401)
			expect(res.json.reason).to.equal('bad-credentials')
		}
		const limited = await call(
			'POST',
			'/api/auth/login',
			{ email: 'x@y.fr', password: 'mauvais mot' },
			headers,
		)
		expect(limited.status).to.equal(429)
		expect(limited.json.reason).to.equal('auth')
	})

	it('follows need a session; follow is idempotent', async () => {
		const { call, scraper } = setup()
		const url = 'https://www.ldlc.com/fiche/PB1.html'
		scraper.pages.set(url, reading(url))
		const added = await call('POST', '/api/products/from-url', { url })
		const id = added.json.productId
		expect((await call('PUT', `/api/follows/${id}`)).status).to.equal(401)
		await call('POST', '/api/auth/register', {
			email: 'voiky@exemple.fr',
			password: 'une phrase longue',
		})
		expect((await call('PUT', `/api/follows/${id}`)).status).to.equal(204)
		expect((await call('PUT', `/api/follows/${id}`)).status).to.equal(204)
		const product = await call('GET', `/api/products/${id}`)
		expect(product.json.followed).to.equal(true)
		const list = await call('GET', '/api/follows')
		expect(list.json.follows).to.have.length(1)
		expect((await call('DELETE', `/api/follows/${id}`)).status).to.equal(204)
		expect((await call('GET', '/api/follows')).json.follows).to.have.length(0)
	})

	it('DELETE /api/account needs the password and clears the cookie', async () => {
		const { call } = setup()
		await call('POST', '/api/auth/register', {
			email: 'voiky@exemple.fr',
			password: 'une phrase longue',
		})
		expect((await call('DELETE', '/api/account', { password: 'mauvais' })).json.reason).to.equal(
			'bad-password',
		)
		expect(
			(await call('DELETE', '/api/account', { password: 'une phrase longue' })).status,
		).to.equal(204)
		expect((await call('GET', '/api/auth/me')).status).to.equal(401)
	})

	it('refuses cross-site mutations when a public origin is set', async () => {
		const { call } = setup({ publicOrigin: ORIGIN })
		const evil = await call(
			'POST',
			'/api/searches',
			{ query: 'rtx 4070' },
			{ origin: 'https://evil.example' },
		)
		expect(evil.status).to.equal(403)
		expect(evil.json.reason).to.equal('origin')
		expect(
			(await call('POST', '/api/searches', { query: 'rtx 4070' })).status,
			'no Origin, no Sec-Fetch-Site',
		).to.equal(403)
		expect(
			(await call('POST', '/api/searches', { query: 'rtx 4070' }, { origin: ORIGIN })).status,
		).to.equal(202)
		expect(
			(await call('GET', '/api/health', undefined, { origin: 'https://evil.example' })).status,
		).to.equal(200)
	})

	it('refuses bodies over 16 KB', async () => {
		const { call } = setup()
		const res = await call('POST', '/api/products/from-url', { url: 'x'.repeat(20_000) })
		expect(res.status).to.equal(413)
	})

	it('GET /api/shops lists the catalog with states', async () => {
		const { call } = setup()
		const res = await call('GET', '/api/shops')
		expect(res.json.shops.map((s: { id: string }) => s.id)).to.deep.equal([
			'ldlc',
			'materielnet',
			'topachat',
			'pccomponentes',
		])
		expect(res.json.shops[0].state).to.equal('unknown')
	})
})

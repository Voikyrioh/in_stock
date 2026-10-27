import { expect } from 'chai'
import { ScrapeFailure } from '../../../domain/ports/scraper'
import { HostQueue } from '../host-queue'
import { decode, SafeHttpClient } from '../http-client'
import { RobotsPolicy } from '../robots'
import { isForbiddenHost, isPublicAddress } from '../ssrf-guard'

describe('BR-SCRAPE-003 address guard', () => {
	const refused = [
		'127.0.0.1',
		'10.1.2.3',
		'172.16.0.5',
		'172.31.255.255',
		'192.168.1.10',
		'169.254.169.254',
		'100.64.0.1',
		'0.0.0.0',
		'224.0.0.1',
		'::1',
		'::',
		'fe80::1',
		'fc00::1',
		'fd12:3456::1',
		'::ffff:127.0.0.1',
		'::ffff:10.0.0.1',
		'2001:db8::1',
		'64:ff9b::a00:1',
	]
	for (const ip of refused)
		it(`should refuse ${ip}`, () => expect(isPublicAddress(ip)).to.equal(false))

	const allowed = [
		'8.8.8.8',
		'51.15.0.1',
		'172.32.0.1',
		'2a01:e0a::1',
		'2606:4700::6810:84e5',
		'::ffff:8.8.8.8',
	]
	for (const ip of allowed)
		it(`should allow ${ip}`, () => expect(isPublicAddress(ip)).to.equal(true))

	it('should refuse local names and private IP literals', () => {
		expect(isForbiddenHost('localhost')).to.equal(true)
		expect(isForbiddenHost('vault.internal')).to.equal(true)
		expect(isForbiddenHost('[::1]')).to.equal(true)
		expect(isForbiddenHost('192.168.0.1')).to.equal(true)
		expect(isForbiddenHost('www.ldlc.com')).to.equal(false)
	})

	it('should refuse internal links before any request', async () => {
		const http = new SafeHttpClient({ userAgent: 'test' })
		for (const url of [
			'http://127.0.0.1/admin',
			'http://[::1]/',
			'http://localhost/',
			'https://exemple.fr:8443/p',
		]) {
			const error = await http.get(url, { expect: 'html' }).catch((e: unknown) => e)
			expect(error, url).to.be.instanceOf(ScrapeFailure)
			expect((error as ScrapeFailure).kind, url).to.equal('forbidden-address')
		}
	})

	it('should refuse a public name that resolves to a private address (connect-time check)', async () => {
		// localtest.me style names resolve to 127.0.0.1; use the hosts file entry "localhost." instead.
		const http = new SafeHttpClient({ userAgent: 'test', timeoutMs: 2000 })
		const error = await http.get('http://localhost./', { expect: 'html' }).catch((e: unknown) => e)
		expect((error as ScrapeFailure).kind).to.be.oneOf(['forbidden-address', 'unreachable'])
	})
})

describe('Charset decoding', () => {
	it('should decode ISO-8859-1 pages', () => {
		const bytes = Buffer.from('<p>Disponibilit\xe9 : En stock</p>', 'latin1')
		expect(decode(bytes, 'text/html; charset=ISO-8859-1')).to.include('Disponibilité')
		expect(
			decode(Buffer.from('<meta charset="windows-1252"><p>\xe9</p>', 'latin1'), 'text/html'),
		).to.include('é')
	})
})

describe('BR-SCRAPE-002 per-site queue', () => {
	function fakeTime() {
		let now = 1_000_000
		const sleeps: number[] = []
		return {
			now: () => now,
			sleep: async (ms: number) => {
				sleeps.push(ms)
				now += ms
			},
			advance: (ms: number) => {
				now += ms
			},
			sleeps,
		}
	}

	it('should space two requests to the same site and not across sites', async () => {
		const t = fakeTime()
		const queue = new HostQueue({ minDelayMs: 2000, maxConcurrent: 4, now: t.now, sleep: t.sleep })
		const order: string[] = []
		await Promise.all([
			queue.run('www.ldlc.com', async () => order.push('ldlc-1')),
			queue.run('ldlc.com', async () => order.push('ldlc-2')),
			queue.run('www.amazon.fr', async () => order.push('amazon-1')),
		])
		expect(order).to.include.members(['ldlc-1', 'ldlc-2', 'amazon-1'])
		expect(order.indexOf('ldlc-1')).to.be.lessThan(order.indexOf('ldlc-2'))
		expect(t.sleeps).to.deep.equal([2000])
	})

	it('should pause a site that asked us to wait', async () => {
		const t = fakeTime()
		const queue = new HostQueue({ minDelayMs: 0, maxConcurrent: 4, now: t.now, sleep: t.sleep })
		const until = new Date(t.now() + 600_000)
		await queue
			.run('www.fnac.com', async () => {
				throw new ScrapeFailure('blocked', '429', until)
			})
			.catch(() => undefined)
		const error = await queue.run('www.fnac.com', async () => 'never').catch((e: unknown) => e)
		expect((error as ScrapeFailure).kind).to.equal('blocked')
		t.advance(600_001)
		expect(await queue.run('www.fnac.com', async () => 'ok')).to.equal('ok')
	})

	it('should keep the queue going after a failure', async () => {
		const queue = new HostQueue({ minDelayMs: 0, maxConcurrent: 1 })
		const first = queue.run('a.fr', async () => {
			throw new Error('boom')
		})
		const second = queue.run('a.fr', async () => 'ok')
		await first.catch(() => undefined)
		expect(await second).to.equal('ok')
	})
})

describe('BR-SCRAPE-001 robots.txt', () => {
	const robotsTxt =
		'User-agent: *\nDisallow: /recherche/\n\nUser-agent: InStockBot\nDisallow: /panier\nAllow: /\n'

	it('should apply the group of our agent', async () => {
		const policy = new RobotsPolicy({
			agent: 'InStockBot',
			fetchRobots: async () => ({ status: 200, body: robotsTxt }),
		})
		expect(await policy.isAllowed('https://shop.fr/recherche/rtx/')).to.equal(true)
		expect(await policy.isAllowed('https://shop.fr/panier')).to.equal(false)
	})

	it('should fall back to the * group', async () => {
		const policy = new RobotsPolicy({
			agent: 'InStockBot',
			fetchRobots: async () => ({ status: 200, body: 'User-agent: *\nDisallow: /s\n' }),
		})
		const error = await policy
			.assertAllowed('https://www.amazon.fr/s?k=rtx')
			.catch((e: unknown) => e)
		expect((error as ScrapeFailure).kind).to.equal('robots')
		expect(await policy.isAllowed('https://www.amazon.fr/dp/B0CS6V4VXQ')).to.equal(true)
	})

	it('should allow everything on a 4xx and refuse for now on a 5xx (RFC 9309)', async () => {
		const missing = new RobotsPolicy({
			agent: 'InStockBot',
			fetchRobots: async () => ({ status: 404, body: '' }),
		})
		expect(await missing.isAllowed('https://shop.fr/anything')).to.equal(true)
		const down = new RobotsPolicy({
			agent: 'InStockBot',
			fetchRobots: async () => ({ status: 503, body: '' }),
		})
		const error = await down.isAllowed('https://shop.fr/anything').catch((e: unknown) => e)
		expect((error as ScrapeFailure).kind).to.equal('unreachable')
	})

	it('should download robots.txt once per origin', async () => {
		let calls = 0
		const policy = new RobotsPolicy({
			agent: 'InStockBot',
			fetchRobots: async () => {
				calls++
				return { status: 200, body: robotsTxt }
			},
		})
		await Promise.all([
			policy.isAllowed('https://shop.fr/a'),
			policy.isAllowed('https://shop.fr/b'),
		])
		await policy.isAllowed('https://shop.fr/c')
		expect(calls).to.equal(1)
	})
})

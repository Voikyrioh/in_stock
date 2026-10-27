/**
 * Probe a shop from the machine where the robot runs (STK-15):
 *   npm run probe -- ldlc "rtx 4070"        search page: strategy, offers found
 *   npm run probe -- all "rtx 4070"         every searchable shop (or ldlc,grosbill)
 *   npm run probe -- url https://…          one product page
 * Same robot as production (robots.txt, User-Agent, address guard, queue).
 * PROBE_DUMP_DIR=<dir>: also saves each shop's robots.txt and raw search page
 * there (workflow « Probe shops », artefact used to fix the selectors).
 */

import { configureLogger } from '@Voikyrioh/observability'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type CheerioAPI, load } from 'cheerio'
import { loadConfig } from '../config'
import { createRobot } from '../data-access/scraping'
import { cleanText } from '../data-access/scraping/extract/html'
import { SafeHttpClient } from '../data-access/scraping/http-client'
import { ScrapeFailure } from '../domain/ports/scraper'

configureLogger({ level: 'warn', pretty: false })
const [target, ...rest] = process.argv.slice(2)
const arg = rest.join(' ').trim()
if (!target || !arg) {
	console.error('Usage: npm run probe -- <shop id | all | url> <query | link>')
	process.exit(2)
}

const config = loadConfig({ ...process.env, STORAGE: 'memory' })
const { scraper, catalog } = createRobot(config.robot)
const dumpDir = process.env.PROBE_DUMP_DIR
const raw = new SafeHttpClient({ userAgent: config.robot.userAgent })

/** Raw robots.txt and search page of a shop, whatever their status (diagnostics only). */
async function dump(id: string) {
	const shop = catalog.definition(id)
	if (!dumpDir || !shop?.searchUrl) return
	await mkdir(dumpDir, { recursive: true })
	const save = async (name: string, url: string, expect: 'html' | 'text') => {
		try {
			const page = await raw.get(url, {
				expect,
				allowHttpErrors: true,
				signal: AbortSignal.timeout(30_000),
			})
			await writeFile(join(dumpDir, name), `<!-- ${page.status} ${page.url} -->\n${page.body}`)
			console.log(
				`\n□ ${id} ${name}: HTTP ${page.status}, ${page.body.length} caractères, ${page.url}`,
			)
			if (expect === 'text') printRobots(page.body)
			else printPage(id, page.body, page.url)
		} catch (error) {
			const kind = error instanceof ScrapeFailure ? error.kind : 'crash'
			await writeFile(join(dumpDir, name), `<!-- FAILED ${kind}: ${(error as Error).message} -->\n`)
		}
	}
	await save(`${id}.robots.txt`, new URL('/robots.txt', shop.homepage).toString(), 'text')
	await new Promise((r) => setTimeout(r, config.robot.minDelayMs))
	await save(`${id}.search.html`, shop.searchUrl(arg), 'html')
	await new Promise((r) => setTimeout(r, config.robot.minDelayMs))
	await printSearchForms(id)
}

/** robots.txt lines that matter to us: groups `*` and InStockBot. */
function printRobots(body: string) {
	let relevant = false
	const lines: string[] = []
	for (const line of body.split(/\r?\n/)) {
		const ua = /^\s*user-agent\s*:\s*(.+)$/i.exec(line)?.[1]?.trim()
		if (ua) relevant = ua === '*' || /instockbot/i.test(ua)
		if (relevant && /^\s*(user-agent|allow|disallow)/i.test(line)) lines.push(`    ${line.trim()}`)
	}
	console.log(lines.slice(0, 40).join('\n') || '    (aucun groupe * ni InStockBot)')
}

/** What the selectors need: cards found, product-like links, raw HTML around prices. */
function printPage(id: string, html: string, url: string) {
	const shop = catalog.definition(id)
	if (!shop) return
	const $ = load(html)
	console.log(`    title: ${$('title').text().trim().slice(0, 120)}`)
	if (html.length < 5000)
		console.log(`    page courte: ${html.replace(/\s+/g, ' ').slice(0, 1200)}`)
	console.log(
		`    json-ld: ${$('script[type="application/ld+json"]').length}, __NEXT_DATA__: ${$('#__NEXT_DATA__').length}`,
	)
	if (shop.listing)
		console.log(`    listing.item « ${shop.listing.item} » : ${$(shop.listing.item).length}`)
	const hrefs = new Set<string>()
	$('a[href]').each((_, el) => {
		try {
			const u = new URL($(el).attr('href') ?? '', url)
			if (shop.hosts.includes(u.hostname)) hrefs.add(u.pathname + u.search)
		} catch {}
	})
	const product = [...hrefs].filter((h) =>
		shop.productUrlPattern.test(`https://${shop.hosts[0]}${h}`),
	)
	console.log(`    liens internes ${hrefs.size}, dont fiches (productUrlPattern) ${product.length}`)
	const others = [...hrefs].filter((h) => !product.includes(h))
	for (const h of [...product.slice(0, 5), ...others].slice(0, 25))
		console.log(`      ${h.slice(0, 140)}`)
	printCards($, url, shop.hosts)
	const priceAt = [...html.matchAll(/\d[\d\s.]*[,.]\d{2}\s*(€|&euro;)|\d+\s*€\s*\d{2}/g)].slice(
		0,
		3,
	)
	for (const m of priceAt) {
		const start = Math.max(0, (m.index ?? 0) - 900)
		console.log(
			`    --- HTML avant le prix « ${m[0]} » ---\n${html.slice(start, (m.index ?? 0) + 60).replace(/\s+/g, ' ')}`,
		)
	}
}

/**
 * Ancestors of the first links that look like a product (long slug or id),
 * matched or not by productUrlPattern: the class names the card selectors need.
 */
function printCards($: CheerioAPI, url: string, hosts: string[]) {
	let shown = 0
	$('a[href]').each((_, el) => {
		if (shown >= 2) return false
		const link = $(el)
		let u: URL
		try {
			u = new URL(link.attr('href') ?? '', url)
		} catch {
			return
		}
		const looksLikeProduct = /\d{5,}|\/(dp|p|fiche|produit|product)\//i.test(u.pathname)
		const samePage = u.pathname === new URL(url).pathname
		if (!hosts.includes(u.hostname) || samePage || !looksLikeProduct || !cleanText(link.text()))
			return
		shown++
		const chain: string[] = []
		let node = link
		for (let level = 0; level < 7 && node.length; level++) {
			const cls = (node.attr('class') ?? '').trim().replace(/\s+/g, '.')
			chain.push(`${node.prop('tagName')?.toLowerCase()}${cls ? `.${cls}` : ''}`)
			node = node.parent()
		}
		console.log(`    --- carte autour de ${u.pathname.slice(0, 100)} ---`)
		console.log(`      ${chain.join(' < ')}`)
		const card = link.closest('article, li').length
			? link.closest('article, li')
			: link.parents().eq(2)
		const html = (card.html() ?? '').replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/\s+/g, ' ')
		console.log(`      ${html.slice(0, 4000)}`)
	})
}

/** Search forms of the home page: where the shop really sends a query. */
async function printSearchForms(id: string) {
	const shop = catalog.definition(id)
	if (!shop) return
	try {
		const page = await raw.get(shop.homepage, {
			expect: 'html',
			allowHttpErrors: true,
			signal: AbortSignal.timeout(30_000),
		})
		const $ = load(page.body)
		console.log(`\n□ ${id} formulaires de l'accueil (HTTP ${page.status})`)
		$('form').each((_, el) => {
			const form = $(el)
			const inputs = form
				.find('input[name], select[name]')
				.map((_, i) => `${$(i).attr('name')}=${$(i).attr('value') ?? ''}`)
				.get()
			console.log(
				`    ${(form.attr('method') ?? 'get').toUpperCase()} ${form.attr('action') ?? '(sans action)'} [${inputs.join(', ')}]`,
			)
		})
		const searchLinks = new Set<string>()
		$('a[href*="search" i], a[href*="recherche" i]').each((_, el) => {
			searchLinks.add(($(el).attr('href') ?? '').slice(0, 140))
		})
		for (const h of [...searchLinks].slice(0, 5)) console.log(`    lien ${h}`)
	} catch (error) {
		console.log(`\n□ ${id} accueil illisible: ${(error as Error).message}`)
	}
}

const euros = (cents: number | null) => (cents === null ? '?' : `${(cents / 100).toFixed(2)}`)

async function probeShop(id: string) {
	await dump(id)
	const started = Date.now()
	try {
		const { offers, diagnostics } = await scraper.searchWithDiagnostics(
			id,
			arg,
			AbortSignal.timeout(60_000),
		)
		console.log(`\n■ ${id}  ${diagnostics.url}`)
		console.log(
			`  strategy: ${diagnostics.strategy}, listed ${diagnostics.listed.length}, offers ${offers.length}, ${Date.now() - started} ms`,
		)
		for (const o of offers.slice(0, 5)) {
			console.log(
				`  - ${euros(o.priceCents)} ${o.currency} ${o.stock.padEnd(12)} ${o.title.slice(0, 70)}`,
			)
			console.log(`    ${o.url}`)
		}
	} catch (error) {
		const kind = error instanceof ScrapeFailure ? error.kind : 'crash'
		console.log(`\n■ ${id}  FAILED (${kind}) ${(error as Error).message}`)
	}
}

if (target === 'url') {
	try {
		const o = await scraper.readProduct(arg, {
			signal: AbortSignal.timeout(60_000),
			trigger: 'user',
		})
		console.log(JSON.stringify(o, null, 2))
	} catch (error) {
		console.log(
			`FAILED (${error instanceof ScrapeFailure ? error.kind : 'crash'}) ${(error as Error).message}`,
		)
	}
} else {
	const ids =
		target === 'all'
			? catalog
					.list()
					.filter((s) => s.capabilities.includes('search'))
					.map((s) => s.id)
			: target.split(',')
	for (const id of ids) await probeShop(id)
}
process.exit(0)

/**
 * Probe a shop from the machine where the robot runs (STK-15):
 *   npm run probe -- ldlc "rtx 4070"        search page: strategy, offers found
 *   npm run probe -- all "rtx 4070"         every searchable shop
 *   npm run probe -- url https://…          one product page
 * Same robot as production (robots.txt, User-Agent, address guard, queue).
 */
import { configureLogger } from '@Voikyrioh/observability'
import { loadConfig } from '../config'
import { createRobot } from '../data-access/scraping'
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
const euros = (cents: number | null) => (cents === null ? '?' : `${(cents / 100).toFixed(2)}`)

async function probeShop(id: string) {
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
		const o = await scraper.readProduct(arg, AbortSignal.timeout(60_000))
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
			: [target]
	for (const id of ids) await probeShop(id)
}
process.exit(0)

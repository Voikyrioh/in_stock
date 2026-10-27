import { HostQueue } from './host-queue'
import { SafeHttpClient } from './http-client'
import { HttpScraper } from './http-scraper'
import { RobotsPolicy } from './robots'
import { StaticShopCatalog } from './shops/catalog'

export interface RobotConfig {
	userAgent: string
	agentToken: string
	minDelayMs: number
	maxConcurrent: number
	respectRobots: boolean
	disabledShops: string[]
}

/** Wires the robot: guarded client → per-site queue → robots.txt → extraction. */
export function createRobot(config: RobotConfig) {
	const catalog = new StaticShopCatalog(config.disabledShops)
	const http = new SafeHttpClient({ userAgent: config.userAgent })
	const queue = new HostQueue({
		minDelayMs: config.minDelayMs,
		maxConcurrent: config.maxConcurrent,
	})
	const robots = new RobotsPolicy({
		agent: config.agentToken,
		fetchRobots: (url, signal) =>
			queue.run(
				new URL(url).hostname,
				() => http.get(url, { signal, expect: 'text', allowHttpErrors: true }),
				signal,
			),
	})
	const scraper = new HttpScraper({
		http,
		queue,
		robots,
		catalog,
		respectRobots: config.respectRobots,
	})
	return { catalog, scraper }
}

export { HttpScraper } from './http-scraper'
export { StaticShopCatalog } from './shops/catalog'

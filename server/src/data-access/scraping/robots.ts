import robotsParser from 'robots-parser'
import { ScrapeFailure } from '../../domain/ports/scraper'

type Robot = ReturnType<typeof robotsParser>

export interface RobotsOptions {
	/** Product token matched in robots.txt groups ("InStockBot"). */
	agent: string
	fetchRobots: (url: string, signal?: AbortSignal) => Promise<{ status: number; body: string }>
	now?: () => number
}

const KEEP_MS = 12 * 3600_000
const UNREACHABLE_KEEP_MS = 2 * 60_000

type Policy = Robot | 'allow-all' | 'unreachable'

/**
 * BR-SCRAPE-001 — robots.txt of each site is honoured (RFC 9309): a 4xx file
 * means everything is allowed, an unreachable one (5xx, network) means nothing
 * is allowed for a while.
 */
export class RobotsPolicy {
	private readonly cache = new Map<string, { robot: Policy; until: number }>()
	private readonly pending = new Map<string, Promise<Policy>>()
	private readonly now: () => number

	constructor(private readonly options: RobotsOptions) {
		this.now = options.now ?? Date.now
	}

	async assertAllowed(url: string, signal?: AbortSignal): Promise<void> {
		if (!(await this.isAllowed(url, signal))) {
			throw new ScrapeFailure('robots', `robots.txt of ${new URL(url).hostname} forbids this page`)
		}
	}

	async isAllowed(url: string, signal?: AbortSignal): Promise<boolean> {
		const policy = await this.policyFor(new URL(url).origin, signal)
		if (policy === 'allow-all') return true
		// RFC 9309: an unreachable robots.txt means « disallow everything » for now,
		// reported as the site being unreachable, not as a refusal of the shop.
		if (policy === 'unreachable')
			throw new ScrapeFailure('unreachable', `robots.txt of ${new URL(url).hostname} unreachable`)
		return policy.isAllowed(url, this.options.agent) !== false
	}

	private async policyFor(origin: string, signal?: AbortSignal) {
		const cached = this.cache.get(origin)
		if (cached && cached.until > this.now()) return cached.robot
		if (this.cache.size > 1000) {
			for (const [key, entry] of this.cache) if (entry.until <= this.now()) this.cache.delete(key)
		}
		const inFlight = this.pending.get(origin)
		if (inFlight) return inFlight
		const task = this.load(origin, signal).finally(() => this.pending.delete(origin))
		this.pending.set(origin, task)
		return task
	}

	private async load(origin: string, signal?: AbortSignal): Promise<Policy> {
		const robotsUrl = `${origin}/robots.txt`
		let robot: Policy
		let keep = KEEP_MS
		try {
			const { status, body } = await this.options.fetchRobots(robotsUrl, signal)
			if (status >= 200 && status < 300) robot = robotsParser(robotsUrl, body)
			else if (status >= 400 && status < 500) robot = 'allow-all'
			else {
				robot = 'unreachable'
				keep = UNREACHABLE_KEEP_MS
			}
		} catch (error) {
			// A refused address or a « slow down » answer surfaces as such (not cached here).
			if (error instanceof ScrapeFailure && ['forbidden-address', 'blocked'].includes(error.kind))
				throw error
			robot = 'unreachable'
			keep = UNREACHABLE_KEEP_MS
		}
		this.cache.set(origin, { robot, until: this.now() + keep })
		return robot
	}
}

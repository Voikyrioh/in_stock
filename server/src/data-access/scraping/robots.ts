import robotsParser from 'robots-parser'
import { ScrapeFailure } from '../../domain/ports/scraper'
import type { RobotsScope } from '../../domain/rules/robots'

type Robot = ReturnType<typeof robotsParser>

export interface RobotsOptions {
	/** Product token matched in robots.txt groups ("InStockBot"). */
	agent: string
	fetchRobots: (url: string, signal?: AbortSignal) => Promise<{ status: number; body: string }>
	now?: () => number
}

const KEEP_MS = 12 * 3600_000
const UNREACHABLE_KEEP_MS = 2 * 60_000

/** Every group, and only the groups that name our agent (`named` null: none does). */
type Parsed = { all: Robot; named: Robot | null }
type Policy = Parsed | 'allow-all' | 'unreachable'

/**
 * BR-SCRAPE-001 — robots.txt of each site (RFC 9309, cache 12 h). Scope
 * `every-group` (scheduled refresh, a crawler): every group applies, a 4xx file
 * means everything is allowed, an unreachable one (5xx, network) means nothing
 * is allowed for a while. Scope `named-group-only` (a person asked for the page):
 * only groups naming our agent apply; without such a group, or without a
 * readable file, the page is read like a browser would.
 */
export class RobotsPolicy {
	private readonly cache = new Map<string, { robot: Policy; until: number }>()
	private readonly pending = new Map<string, Promise<Policy>>()
	private readonly now: () => number

	constructor(private readonly options: RobotsOptions) {
		this.now = options.now ?? Date.now
	}

	async assertAllowed(url: string, scope: RobotsScope, signal?: AbortSignal): Promise<void> {
		if (!(await this.isAllowed(url, scope, signal))) {
			throw new ScrapeFailure('robots', `robots.txt of ${new URL(url).hostname} forbids this page`)
		}
	}

	async isAllowed(
		url: string,
		scope: RobotsScope = 'every-group',
		signal?: AbortSignal,
	): Promise<boolean> {
		const policy = await this.policyFor(new URL(url).origin, signal)
		if (policy === 'allow-all') return true
		if (scope === 'named-group-only') {
			if (policy === 'unreachable' || !policy.named) return true
			return policy.named.isAllowed(url, this.options.agent) !== false
		}
		// RFC 9309: an unreachable robots.txt means « disallow everything » for now,
		// reported as the site being unreachable, not as a refusal of the shop.
		if (policy === 'unreachable')
			throw new ScrapeFailure('unreachable', `robots.txt of ${new URL(url).hostname} unreachable`)
		return policy.all.isAllowed(url, this.options.agent) !== false
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
			if (status >= 200 && status < 300) {
				const named = namedGroupsOnly(body, this.options.agent)
				robot = {
					all: robotsParser(robotsUrl, body),
					named: named ? robotsParser(robotsUrl, named) : null,
				}
			} else if (status >= 400 && status < 500) robot = 'allow-all'
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

/**
 * The groups of a robots.txt whose `User-agent` lines name our product token
 * (case-insensitive, RFC 9309 §2.2.1), as a robots.txt of their own; null when
 * no group names us. Wildcard groups (`*`) are left out on purpose.
 */
export function namedGroupsOnly(robotsTxt: string, agent: string): string | null {
	const token = agent.toLowerCase()
	const kept: string[] = []
	let agents: string[] = []
	let rules: string[] = []
	let inRules = false
	const flush = () => {
		if (agents.some((a) => a === token))
			kept.push(...agents.map((a) => `User-agent: ${a}`), ...rules, '')
		agents = []
		rules = []
		inRules = false
	}
	for (const raw of robotsTxt.split(/\r?\n/)) {
		const line = raw.replace(/#.*$/, '').trim()
		const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line)
		if (!match) continue
		const key = (match[1] ?? '').toLowerCase()
		const value = (match[2] ?? '').trim()
		if (key === 'user-agent') {
			if (inRules) flush()
			agents.push(value.toLowerCase())
		} else if (key === 'allow' || key === 'disallow') {
			inRules = true
			rules.push(`${key === 'allow' ? 'Allow' : 'Disallow'}: ${value}`)
		}
	}
	flush()
	return kept.length ? kept.join('\n') : null
}

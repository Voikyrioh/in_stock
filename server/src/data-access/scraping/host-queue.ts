import { ScrapeFailure } from '../../domain/ports/scraper'

export interface HostQueueOptions {
	/** BR-SCRAPE-002: at least this delay between two requests to the same site. */
	minDelayMs: number
	/** Requests in flight for all sites together. */
	maxConcurrent: number
	now?: () => number
	sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
}

/**
 * BR-SCRAPE-002 — one request at a time per site, a pause between two, and a
 * longer pause when the site asks for it (429/503 or anti-robot page).
 */
export class HostQueue {
	private readonly tails = new Map<string, Promise<unknown>>()
	private readonly lastStart = new Map<string, number>()
	private readonly pausedUntil = new Map<string, number>()
	private active = 0
	private readonly waiting: (() => void)[] = []
	private readonly now: () => number
	private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>

	constructor(private readonly options: HostQueueOptions) {
		this.now = options.now ?? Date.now
		this.sleep = options.sleep ?? abortableSleep
	}

	/** Same site whatever the subdomain: www.ldlc.com and ldlc.com share one queue. */
	static siteKey(hostname: string): string {
		return hostname.toLowerCase().replace(/^www\d?\./, '')
	}

	pause(hostname: string, until: Date): void {
		this.pausedUntil.set(HostQueue.siteKey(hostname), until.getTime())
	}

	pausedFor(hostname: string): number {
		return Math.max(0, (this.pausedUntil.get(HostQueue.siteKey(hostname)) ?? 0) - this.now())
	}

	run<T>(hostname: string, task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
		const key = HostQueue.siteKey(hostname)
		const previous = this.tails.get(key) ?? Promise.resolve()
		const current = previous.then(
			() => this.execute(key, task, signal),
			() => this.execute(key, task, signal),
		)
		const tail = current.catch(() => undefined)
		this.tails.set(key, tail)
		void tail.then(() => {
			if (this.tails.get(key) === tail) this.tails.delete(key)
		})
		return current
	}

	/** Pasted links can come from any site: forget sites idle for an hour (bounded memory). */
	private forgetIdleSites() {
		if (this.lastStart.size < 500) return
		const limit = this.now() - 3600_000
		for (const [key, at] of this.lastStart) {
			if (at < limit && (this.pausedUntil.get(key) ?? 0) < this.now() && !this.tails.has(key)) {
				this.lastStart.delete(key)
				this.pausedUntil.delete(key)
			}
		}
	}

	private async execute<T>(key: string, task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
		signal?.throwIfAborted()
		this.forgetIdleSites()
		const paused = (this.pausedUntil.get(key) ?? 0) - this.now()
		if (paused > 0) {
			throw new ScrapeFailure('blocked', `${key} asked us to wait`, new Date(this.now() + paused))
		}
		const wait = (this.lastStart.get(key) ?? 0) + this.options.minDelayMs - this.now()
		if (wait > 0)
			await this.sleep(wait, signal).catch(() => {
				throw new ScrapeFailure('timeout', 'Gave up while waiting for our turn')
			})
		await this.acquire(signal)
		this.lastStart.set(key, this.now())
		try {
			return await task()
		} catch (error) {
			if (error instanceof ScrapeFailure && error.pausedUntil)
				this.pausedUntil.set(key, error.pausedUntil.getTime())
			throw error
		} finally {
			this.release()
		}
	}

	private acquire(signal?: AbortSignal): Promise<void> {
		if (this.active < this.options.maxConcurrent) {
			this.active++
			return Promise.resolve()
		}
		return new Promise((resolve, reject) => {
			const grant = () => {
				signal?.removeEventListener('abort', onAbort)
				this.active++
				resolve()
			}
			const onAbort = () => {
				const index = this.waiting.indexOf(grant)
				if (index >= 0) this.waiting.splice(index, 1)
				reject(new ScrapeFailure('timeout', 'Gave up while waiting for a free slot'))
			}
			signal?.addEventListener('abort', onAbort, { once: true })
			this.waiting.push(grant)
		})
	}

	private release() {
		this.active--
		this.waiting.shift()?.()
	}
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(signal.reason)
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort)
			resolve()
		}, ms)
		const onAbort = () => {
			clearTimeout(timer)
			reject(signal?.reason)
		}
		signal?.addEventListener('abort', onAbort, { once: true })
	})
}

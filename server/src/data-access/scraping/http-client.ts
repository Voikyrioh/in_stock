import { Agent, fetch } from 'undici'
import { ScrapeFailure } from '../../domain/ports/scraper'
import { checkUrlShape } from '../../domain/rules/url'
import { ForbiddenAddressError, guardedLookup, isForbiddenHost } from './ssrf-guard'

export interface HttpPage {
	url: string
	status: number
	contentType: string
	body: string
}

export interface HttpClientOptions {
	userAgent: string
	maxBytes?: number
	timeoutMs?: number
	maxRedirects?: number
}

export interface GetOptions {
	signal?: AbortSignal
	/** 'html' pages for products and searches, 'text' for robots.txt. */
	expect: 'html' | 'text'
	/** Answer 4xx/5xx pages instead of throwing (robots.txt needs the status). */
	allowHttpErrors?: boolean
}

const PAUSE_MS = 10 * 60_000

/**
 * The robot's only way out (BR-SCRAPE-003): public addresses only, 3
 * redirections at most (each one checked again), 3 MB and 10 s per page.
 */
export class SafeHttpClient {
	private readonly agent: Agent
	private readonly maxBytes: number
	private readonly timeoutMs: number
	private readonly maxRedirects: number

	constructor(private readonly options: HttpClientOptions) {
		this.maxBytes = options.maxBytes ?? 3 * 1024 * 1024
		this.timeoutMs = options.timeoutMs ?? 10_000
		this.maxRedirects = options.maxRedirects ?? 3
		this.agent = new Agent({
			connect: { lookup: guardedLookup, timeout: this.timeoutMs },
			headersTimeout: this.timeoutMs,
			bodyTimeout: this.timeoutMs,
			connections: 4,
		})
	}

	async get(
		rawUrl: string,
		{ signal, expect, allowHttpErrors = false }: GetOptions,
	): Promise<HttpPage> {
		let current = rawUrl
		for (let hop = 0; hop <= this.maxRedirects; hop++) {
			const url = this.check(current)
			const response = await this.send(url, expect, signal)
			if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
				await response.body?.cancel().catch(() => undefined)
				current = new URL(response.headers.get('location') as string, url).toString()
				continue
			}
			const contentType = response.headers.get('content-type') ?? ''
			if (isChallenge(response.status, response.headers)) {
				await response.body?.cancel().catch(() => undefined)
				throw new ScrapeFailure(
					'blocked',
					`Blocked by ${url.hostname} (${response.status})`,
					pause(response.headers),
				)
			}
			if (response.status >= 400) {
				await response.body?.cancel().catch(() => undefined)
				if (allowHttpErrors)
					return { url: url.toString(), status: response.status, contentType, body: '' }
				throw new ScrapeFailure('http', `${url.hostname} answered ${response.status}`)
			}
			if (expect === 'html' && !/html|xml/i.test(contentType)) {
				await response.body?.cancel().catch(() => undefined)
				throw new ScrapeFailure('not-html', `Not a web page (${contentType || 'no type'})`)
			}
			const body = await this.readBody(response, contentType)
			if (expect === 'html' && isChallengePage(body)) {
				throw new ScrapeFailure(
					'blocked',
					`Anti-robot page on ${url.hostname}`,
					new Date(Date.now() + PAUSE_MS),
				)
			}
			return { url: url.toString(), status: response.status, contentType, body }
		}
		throw new ScrapeFailure('http', 'Too many redirections')
	}

	private check(raw: string): URL {
		const shape = checkUrlShape(raw)
		if (!shape.ok) throw new ScrapeFailure('forbidden-address', 'Link refused')
		if (isForbiddenHost(shape.url.hostname))
			throw new ScrapeFailure('forbidden-address', 'Address refused')
		return shape.url
	}

	private async send(url: URL, expect: GetOptions['expect'], signal?: AbortSignal) {
		const timeout = AbortSignal.timeout(this.timeoutMs)
		try {
			return await fetch(url, {
				dispatcher: this.agent,
				redirect: 'manual',
				signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
				headers: {
					'user-agent': this.options.userAgent,
					accept:
						expect === 'html'
							? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'
							: 'text/plain,*/*;q=0.5',
					'accept-language': 'fr-FR,fr;q=0.9,en;q=0.6',
				},
			})
		} catch (error) {
			throw toFailure(error)
		}
	}

	private async readBody(
		response: Awaited<ReturnType<typeof fetch>>,
		contentType: string,
	): Promise<string> {
		const declared = Number(response.headers.get('content-length') ?? 0)
		if (declared > this.maxBytes) {
			await response.body?.cancel().catch(() => undefined)
			throw new ScrapeFailure('too-large', 'Page too large')
		}
		const chunks: Uint8Array[] = []
		let size = 0
		try {
			for await (const chunk of response.body ?? []) {
				size += chunk.byteLength
				if (size > this.maxBytes) throw new ScrapeFailure('too-large', 'Page too large')
				chunks.push(chunk)
			}
		} catch (error) {
			throw error instanceof ScrapeFailure ? error : toFailure(error)
		}
		return decode(Buffer.concat(chunks), contentType)
	}
}

/** Many French shops still serve ISO-8859-1 / Windows-1252 pages. */
export function decode(bytes: Buffer, contentType: string): string {
	let charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1]
	if (!charset) {
		const head = bytes.subarray(0, 2048).toString('latin1')
		charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1]
	}
	try {
		return new TextDecoder(charset ?? 'utf-8').decode(bytes)
	} catch {
		return new TextDecoder('utf-8').decode(bytes)
	}
}

function isChallenge(status: number, headers: Headers): boolean {
	if (status === 429 || status === 503) return true
	if (status !== 403) return false
	return (
		headers.has('cf-mitigated') ||
		/datadome|captcha/i.test(headers.get('set-cookie') ?? '') ||
		headers.has('x-datadome')
	)
}

const CHALLENGE_MARKERS = [
	'cf-chl-',
	'challenge-platform',
	'captcha-delivery.com',
	'geo.captcha-delivery',
	'/_Incapsula_Resource',
	'Robot Check</title>',
	'px-captcha',
]

function isChallengePage(body: string): boolean {
	if (body.length > 200_000) return false
	return CHALLENGE_MARKERS.some((m) => body.includes(m))
}

function pause(headers: Headers): Date {
	const retry = Number(headers.get('retry-after'))
	const ms = Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 3600_000) : PAUSE_MS
	return new Date(Date.now() + Math.max(ms, 60_000))
}

function toFailure(error: unknown): ScrapeFailure {
	const err = error as { name?: string; code?: string; cause?: { code?: string; name?: string } }
	const code = err.cause?.code ?? err.code
	if (
		error instanceof ForbiddenAddressError ||
		code === 'EFORBIDDENADDRESS' ||
		err.cause instanceof ForbiddenAddressError
	) {
		return new ScrapeFailure('forbidden-address', 'Address refused')
	}
	if (err.name === 'TimeoutError' || err.name === 'AbortError' || /TIMEOUT/i.test(code ?? '')) {
		return new ScrapeFailure('timeout', 'No answer in time')
	}
	return new ScrapeFailure('unreachable', `Site unreachable (${code ?? err.name ?? 'error'})`)
}

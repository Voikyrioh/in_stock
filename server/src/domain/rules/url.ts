import { LIMITS } from '@in-stock/shared'

export type UrlShapeProblem = 'format' | 'forbidden'

/**
 * BR-SCRAPE-003 (shape part) — only absolute http(s) links on the default port,
 * without credentials. The address part (public Internet only) is checked by
 * the robot at resolution time (data-access/scraping/ssrf-guard.ts).
 */
export function checkUrlShape(
	raw: string,
): { ok: true; url: URL } | { ok: false; problem: UrlShapeProblem } {
	const trimmed = raw.trim()
	if (!trimmed || trimmed.length > LIMITS.urlMax) return { ok: false, problem: 'format' }
	let url: URL
	try {
		url = new URL(trimmed)
	} catch {
		return { ok: false, problem: 'format' }
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, problem: 'format' }
	if (!url.hostname.includes('.') && !url.hostname.startsWith('[')) {
		return { ok: false, problem: 'forbidden' }
	}
	if (url.username || url.password || url.port) return { ok: false, problem: 'forbidden' }
	return { ok: true, url }
}

const TRACKING_PARAMS = [
	/^utm_/i,
	/^(gclid|gbraid|wbraid|fbclid|msclkid|dclid|yclid|srsltid|mc_cid|mc_eid|_ga|_gl)$/i,
	/^(ref|ref_|refsrc|referrer|source|src|from|origin|cmp|campaign|xtor|awc|aff|affid|affiliate|tag|linkcode|ascsubtag|psc|th|smid|sr|qid|crid|keywords|sprefix|spm|ns_mchannel|ns_source|cm_mmc|ectrans|LGWCODE|esl-k|gad_source)$/i,
]

/**
 * BR-SCRAPE-005 — the identity of an offer: lower-case host, no fragment, no
 * tracking parameter, sorted remaining parameters. Amazon product links keep
 * only their ASIN (/dp/XXXXXXXXXX).
 */
export function normaliseOfferUrl(input: string | URL): string {
	const url = new URL(input.toString())
	url.hash = ''
	url.hostname = url.hostname.toLowerCase()
	if (/(^|\.)amazon\.[a-z.]+$/.test(url.hostname)) {
		const asin = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i.exec(url.pathname)?.[1]
		if (asin) return `${url.protocol}//${url.hostname}/dp/${asin.toUpperCase()}`
	}
	const kept = [...url.searchParams.entries()]
		.filter(([key]) => !TRACKING_PARAMS.some((p) => p.test(key)))
		.sort(([a], [b]) => a.localeCompare(b))
	url.search = ''
	for (const [key, value] of kept) url.searchParams.append(key, value)
	return url.toString()
}

/** BR-SHOP-002 — display name of an unlisted shop: its host without "www.". */
export function shopNameFromHost(hostname: string): string {
	return hostname.toLowerCase().replace(/^www\d?\./, '')
}

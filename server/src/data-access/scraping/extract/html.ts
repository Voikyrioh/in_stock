import type { CheerioAPI } from 'cheerio'

/** Collapses whitespace; null for empty or non-string values. Tags become spaces, so
 * "<p>tr/min</p><p>Rupture</p>" keeps its word boundary (cheerio .text() would glue them). */
export function cleanText(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const text = value
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;|&#160;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim()
	return text ? text : null
}

/** http(s) absolute URL resolved against the page, or null. */
export function absoluteUrl(value: string | null | undefined, base: string): string | null {
	if (!value?.trim() || value.startsWith('data:')) return null
	try {
		const url = new URL(value.trim(), base)
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
	} catch {
		return null
	}
}

/** Every JSON-LD node of the page, flattened (@graph, arrays, nested itemListElement kept as is). */
export function jsonLdNodes($: CheerioAPI): Record<string, unknown>[] {
	const nodes: Record<string, unknown>[] = []
	$('script[type="application/ld+json" i]').each((_, el) => {
		const raw = $(el).text().trim()
		if (!raw) return
		const parsed = parseLenient(raw)
		const stack: unknown[] = [parsed]
		while (stack.length) {
			const item = stack.pop()
			if (Array.isArray(item)) stack.push(...item)
			else if (item && typeof item === 'object') {
				const node = item as Record<string, unknown>
				if (Array.isArray(node['@graph'])) stack.push(...(node['@graph'] as unknown[]))
				if (node['@type']) nodes.push(node)
			}
		}
	})
	return nodes
}

/** Some shops ship JSON-LD with raw newlines in strings or trailing commas. */
function parseLenient(raw: string): unknown {
	const text = raw.replace(/^<!--|-->$/g, '').trim()
	try {
		return JSON.parse(text)
	} catch {
		try {
			return JSON.parse(text.replace(/[\r\n\t]+/g, ' ').replace(/,\s*([}\]])/g, '$1'))
		} catch {
			return null
		}
	}
}

/** Lower-cased schema.org types of a node ("Product", ["Product","Thing"], "schema:Product"). */
export function typesOf(node: Record<string, unknown>): string[] {
	const raw = node['@type']
	const list = Array.isArray(raw) ? raw : [raw]
	return list
		.filter((t): t is string => typeof t === 'string')
		.map((t) => t.replace(/^.*[/:]/, '').toLowerCase())
}

import { LIMITS } from '@in-stock/shared'

/** BR-SEARCH-001 — trims and collapses spaces; null when the length is out of bounds. */
export function cleanQuery(raw: string): string | null {
	const cleaned = raw.replace(/\s+/g, ' ').trim()
	if (cleaned.length < LIMITS.queryMin || cleaned.length > LIMITS.queryMax) return null
	return cleaned
}

/** Cache / deduplication key of a query: case and spacing do not change its meaning. */
export function queryKey(cleaned: string): string {
	return cleaned.toLocaleLowerCase('fr-FR')
}

/** A pasted link is not a search: the client sends it to the add-by-link flow. */
export function looksLikeUrl(raw: string): boolean {
	return /^https?:\/\//i.test(raw.trim())
}

/**
 * BR-SEARCH-006 — two offers are the same product when they share a GTIN
 * (EAN/UPC), or the same brand and manufacturer reference. Codes are
 * normalised first; an invalid GTIN is ignored rather than trusted.
 */

/** GTIN-8/12/13/14 with a valid check digit, padded to 14 digits; null otherwise. */
export function normaliseGtin(raw: unknown): string | null {
	if (typeof raw !== 'string' && typeof raw !== 'number') return null
	const digits = String(raw).replace(/\D/g, '')
	if (![8, 12, 13, 14].includes(digits.length)) return null
	const padded = digits.padStart(14, '0')
	if (/^0+$/.test(padded)) return null
	let sum = 0
	for (let i = 0; i < 13; i++) sum += Number(padded[i]) * (i % 2 === 0 ? 3 : 1)
	const check = (10 - (sum % 10)) % 10
	return check === Number(padded[13]) ? padded : null
}

export function normaliseMpn(raw: unknown): string | null {
	if (typeof raw !== 'string') return null
	const value = raw.toUpperCase().replace(/\s+/g, '').trim()
	return value.length >= 3 && value.length <= 64 ? value : null
}

export function normaliseBrand(raw: unknown): string | null {
	if (typeof raw !== 'string') return null
	const value = raw.replace(/\s+/g, ' ').trim()
	return value.length >= 1 && value.length <= 80 ? value : null
}

export type GroupingKey =
	| { kind: 'gtin'; gtin: string }
	| { kind: 'mpn'; brand: string; mpn: string }
	| null

export function groupingKey(offer: {
	gtin?: string | null
	brand?: string | null
	mpn?: string | null
}): GroupingKey {
	const gtin = normaliseGtin(offer.gtin ?? null)
	if (gtin) return { kind: 'gtin', gtin }
	const brand = normaliseBrand(offer.brand ?? null)
	const mpn = normaliseMpn(offer.mpn ?? null)
	if (brand && mpn) return { kind: 'mpn', brand: brand.toLowerCase(), mpn }
	return null
}

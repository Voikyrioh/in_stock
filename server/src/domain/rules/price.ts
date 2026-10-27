/**
 * BR-PRICE-001 / BR-PRICE-002 — a price is an integer number of cents. Any
 * text that cannot be read with certainty is `null` (unknown), never 0.
 */

const MAX_CENTS = 100_000_000 // 1 000 000 € : beyond, the text was not a price

/** Reads a price from a shop text or a structured value ("1 299,95 €", "599€95", 1299.95). */
export function parsePrice(input: unknown): number | null {
	if (typeof input === 'number') return fromNumber(input)
	if (typeof input !== 'string') return null
	const text = input.replace(/[   ]/g, ' ').trim()
	if (!text) return null

	// LDLC group style: "1 299€95" (the currency sign is the decimal separator).
	const euroInside = /(\d[\d .]*)\s*€\s*(\d{2})(?!\d)/.exec(text)
	if (euroInside?.[1] && euroInside[2]) {
		const euros = Number(euroInside[1].replace(/[ .]/g, ''))
		return guard(euros * 100 + Number(euroInside[2]))
	}

	const token = /\d[\d ',.’]*/.exec(text)?.[0]?.trim()
	if (!token) return null
	let digits = token.replace(/[ '’]/g, '').replace(/[.,]+$/, '')
	const lastComma = digits.lastIndexOf(',')
	const lastDot = digits.lastIndexOf('.')
	if (lastComma >= 0 && lastDot >= 0) {
		// The separator that comes last is the decimal one.
		const decimal = lastComma > lastDot ? ',' : '.'
		const thousands = decimal === ',' ? '.' : ','
		digits = digits.split(thousands).join('').replace(decimal, '.')
	} else if (lastComma >= 0 || lastDot >= 0) {
		const sep = lastComma >= 0 ? ',' : '.'
		const parts = digits.split(sep)
		const last = parts[parts.length - 1] ?? ''
		if (parts.length === 2 && last.length <= 2) digits = parts.join('.')
		else if (parts.slice(1).every((p) => p.length === 3)) digits = parts.join('')
		else return null
	}
	if (!/^\d+(\.\d{1,2})?$/.test(digits)) return null
	return fromNumber(Number(digits))
}

function fromNumber(value: number): number | null {
	if (!Number.isFinite(value) || value <= 0) return null
	return guard(Math.round(value * 100))
}

function guard(cents: number): number | null {
	return Number.isInteger(cents) && cents > 0 && cents < MAX_CENTS ? cents : null
}

const CURRENCY_SIGNS: [RegExp, string][] = [
	[/€|\bEUR\b/i, 'EUR'],
	[/£|\bGBP\b/i, 'GBP'],
	[/\bCHF\b/i, 'CHF'],
	[/\$|\bUSD\b/i, 'USD'],
]

/** ISO 4217 code of a price text or a structured currency value. Defaults to EUR. */
export function parseCurrency(input: unknown, fallback = 'EUR'): string {
	if (typeof input !== 'string') return fallback
	const value = input.trim()
	if (/^[A-Za-z]{3}$/.test(value)) return value.toUpperCase()
	for (const [pattern, code] of CURRENCY_SIGNS) if (pattern.test(value)) return code
	return fallback
}

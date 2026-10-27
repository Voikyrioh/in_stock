import { describe, expect, it } from 'vitest'
import { ApiError, errorMessage } from '../api/http'
import { safeRedirect } from '../lib/auth-redirect'
import { MESSAGES, STOCK_LABELS, searchStatusLabel } from '../lib/copy'
import { clockTime, priceParts, relativeTime } from '../lib/format'
import { onlyAvailable, sortOffers } from '../lib/sort'

describe('format', () => {
	it('splits a price into units and decimals', () => {
		expect(priceParts(59995)).toEqual({ units: '599', decimals: ',95 €' })
		expect(priceParts(129995).units).toBe('1 299')
	})

	it('writes relative times in French', () => {
		const now = new Date('2026-10-27T12:00:00Z')
		expect(relativeTime(null, now)).toBe('jamais')
		expect(relativeTime('2026-10-27T11:59:50Z', now)).toBe("à l'instant")
		expect(relativeTime('2026-10-27T11:56:00Z', now)).toBe('il y a 4 min')
		expect(relativeTime('2026-10-27T10:00:00Z', now)).toBe('il y a 2 h')
		expect(relativeTime('2026-10-24T12:00:00Z', now)).toBe('il y a 3 jours')
		expect(clockTime('2026-10-27T12:02:00Z')).toMatch(/^\d{2}:02$/)
	})
})

describe('copy', () => {
	it('has a label for every stock state and no em dash (ADR-0013)', () => {
		expect(Object.keys(STOCK_LABELS)).toHaveLength(7)
		const all = [
			...Object.values(STOCK_LABELS),
			...Object.values(MESSAGES).map((m) => (typeof m === 'function' ? m('x') : m)),
		]
		for (const text of all) expect(text).not.toContain('—')
	})

	it('describes each shop status of a search', () => {
		expect(searchStatusLabel('done', 6)).toBe('6 offres')
		expect(searchStatusLabel('cached', 1)).toBe('1 offre')
		expect(searchStatusLabel('timeout', 0)).toBe('trop lente, ignorée')
		expect(searchStatusLabel('blocked', 0)).toBe('indisponible pour le moment')
		expect(searchStatusLabel('forbidden', 0)).toBe('lecture interdite par la boutique')
	})

	it('maps API reasons to the validated wordings', () => {
		expect(errorMessage(new ApiError(400, 'invalid-payload', 'url-forbidden', null))).toBe(
			MESSAGES.urlForbidden,
		)
		expect(errorMessage(new ApiError(401, 'unauthorized', 'bad-credentials', null))).toBe(
			MESSAGES.badCredentials,
		)
		expect(errorMessage(new ApiError(429, 'rate-limited', 'refresh-too-soon', null))).toBe(
			MESSAGES.refreshTooSoon,
		)
		expect(errorMessage(new Error('x'))).toBe(MESSAGES.serviceDown)
	})
})

describe('sort and filter (BR-SEARCH-005)', () => {
	const offers = [
		{ stock: 'out_of_stock' as const, priceCents: 100 },
		{ stock: 'in_stock' as const, priceCents: null },
		{ stock: 'in_stock' as const, priceCents: 500 },
		{ stock: 'limited' as const, priceCents: 300 },
	]
	it('sorts by availability then price', () => {
		expect(sortOffers(offers, 'availability').map((o) => o.priceCents)).toEqual([
			500,
			null,
			300,
			100,
		])
		expect(sortOffers(offers, 'price-desc').map((o) => o.priceCents)).toEqual([500, 300, 100, null])
	})
	it('keeps only orderable offers', () => {
		expect(onlyAvailable(offers)).toHaveLength(3)
	})
})

describe('safeRedirect', () => {
	it('keeps internal paths only', () => {
		expect(safeRedirect('/produit/01ABC')).toBe('/produit/01ABC')
		expect(safeRedirect('//evil.example')).toBe(null)
		expect(safeRedirect('https://evil.example')).toBe(null)
		expect(safeRedirect('/\\evil.example')).toBe(null)
		expect(safeRedirect(undefined)).toBe(null)
	})
})

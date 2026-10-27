import { isAvailable, LIMITS, type StockState, stockRank } from '@in-stock/shared'

export interface RankedOffer {
	priceCents: number | null
	currency: string
	stock: StockState
}

export type OfferSort = 'availability' | 'price-asc' | 'price-desc'

/** BR-SEARCH-005 — availability first, then price ascending, unknown prices last. */
export function compareOffers(
	a: RankedOffer,
	b: RankedOffer,
	sort: OfferSort = 'availability',
): number {
	if (sort === 'availability') {
		const byStock = stockRank(a.stock) - stockRank(b.stock)
		if (byStock !== 0) return byStock
	}
	if (a.priceCents === null && b.priceCents === null) return 0
	if (a.priceCents === null) return 1
	if (b.priceCents === null) return -1
	return sort === 'price-desc' ? b.priceCents - a.priceCents : a.priceCents - b.priceCents
}

/** BR-OFFER-005 — available offer with the lowest known price in euros, or null. */
export function bestOffer<T extends RankedOffer>(offers: readonly T[]): T | null {
	let best: T | null = null
	for (const offer of offers) {
		if (!isAvailable(offer.stock) || offer.priceCents === null || offer.currency !== 'EUR') continue
		if (!best || offer.priceCents < (best.priceCents as number)) best = offer
	}
	return best
}

/** BR-OFFER-002 / BR-FOLLOW-003 — an offer is due for a refresh after 30 minutes. */
export function isDue(lastCheckedAt: Date | null, now: Date): boolean {
	return !lastCheckedAt || now.getTime() - lastCheckedAt.getTime() >= LIMITS.staleAfterMs
}

/** BR-OFFER-003 — a manual refresh is refused while every offer was checked in the last 2 minutes. */
export function refreshCooldownLeft(lastChecks: readonly (Date | null)[], now: Date): number {
	if (lastChecks.length === 0 || lastChecks.some((d) => d === null)) return 0
	const oldest = Math.min(...lastChecks.map((d) => (d as Date).getTime()))
	return Math.max(0, oldest + LIMITS.refreshCooldownMs - now.getTime())
}

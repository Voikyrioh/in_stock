import { LIMITS } from '@in-stock/shared'

/** BR-FOLLOW-002 — an account follows at most 100 products. */
export function canFollowMore(currentCount: number): boolean {
	return currentCount < LIMITS.followsMax
}

export interface FollowRankFacts {
	inStockCount: number
	bestPriceCents: number | null
	followedAt: Date
}

/** BR-FOLLOW-004 — in stock first, then best price, then most recently followed. */
export function compareFollows(a: FollowRankFacts, b: FollowRankFacts): number {
	const aIn = a.inStockCount > 0 ? 0 : 1
	const bIn = b.inStockCount > 0 ? 0 : 1
	if (aIn !== bIn) return aIn - bIn
	if (
		a.bestPriceCents !== null &&
		b.bestPriceCents !== null &&
		a.bestPriceCents !== b.bestPriceCents
	) {
		return a.bestPriceCents - b.bestPriceCents
	}
	if (a.bestPriceCents === null) {
		if (b.bestPriceCents !== null) return 1
	} else if (b.bestPriceCents === null) return -1
	return b.followedAt.getTime() - a.followedAt.getTime()
}

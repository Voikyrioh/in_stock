import type { ShopState } from '@in-stock/shared'

export interface ShopHealthFacts {
	lastSuccessAt: Date | null
	lastFailureAt: Date | null
	consecutiveFailures: number
	pausedUntil: Date | null
	robotsForbidden: boolean
}

/** BR-SHOP-001 — state shown for a shop from its recent reading history. */
export function shopState(health: ShopHealthFacts | null, now: Date): ShopState {
	if (!health) return 'unknown'
	if (health.robotsForbidden) return 'forbidden'
	if (health.pausedUntil && health.pausedUntil > now) return 'down'
	if (health.consecutiveFailures >= 3) return 'down'
	if (health.consecutiveFailures > 0) return 'degraded'
	return health.lastSuccessAt ? 'operational' : 'unknown'
}

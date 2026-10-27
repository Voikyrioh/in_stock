/**
 * Who asked for a reading: a person waiting for the answer (search, pasted
 * link, product page, « Actualiser »), or the scheduler (followed products).
 */
export type ReadingTrigger = 'user' | 'schedule'

export type RobotsScope = 'every-group' | 'named-group-only'

/**
 * BR-SCRAPE-001 (ADR-0003, revised 2026-10-27) — robots.txt governs crawlers
 * (RFC 9309). The scheduled refresh is one: every group applies, `User-agent: *`
 * included. A reading a person asked for is that person's request, made like a
 * browser would: only the rules that name InStockBot itself apply, so a shop can
 * always refuse us by name.
 */
export function robotsScope(trigger: ReadingTrigger): RobotsScope {
	return trigger === 'schedule' ? 'every-group' : 'named-group-only'
}

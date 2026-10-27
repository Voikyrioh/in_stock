/**
 * The seven normalised stock states (BR-STOCK-001), in display priority order
 * (BR-SEARCH-005): the first states are the most useful to a buyer.
 */
export const STOCK_STATES = [
	'in_stock',
	'limited',
	'preorder',
	'backorder',
	'unknown',
	'out_of_stock',
	'discontinued',
] as const

export type StockState = (typeof STOCK_STATES)[number]

/** States a buyer can order right now (filter « En stock uniquement »). */
export const AVAILABLE_STATES: readonly StockState[] = ['in_stock', 'limited']

export function isAvailable(stock: StockState): boolean {
	return AVAILABLE_STATES.includes(stock)
}

export function stockRank(stock: StockState): number {
	return STOCK_STATES.indexOf(stock)
}

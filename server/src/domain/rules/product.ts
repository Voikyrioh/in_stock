import type { StockState } from '@in-stock/shared'

/** BR-SCRAPE-004 — a page is a product when it has a name and a price or a known stock state. */
export function isReadableProduct(page: {
	title: string | null
	priceCents: number | null
	stock: StockState
}): boolean {
	return Boolean(page.title?.trim()) && (page.priceCents !== null || page.stock !== 'unknown')
}

import { isAvailable, type OfferView, stockRank } from '@in-stock/shared'

export type OfferSort = 'availability' | 'price-asc' | 'price-desc'

/** Same order as the server (BR-SEARCH-005), applied again after a filter or a sort change. */
export function sortOffers<T extends Pick<OfferView, 'stock' | 'priceCents'>>(
	offers: T[],
	sort: OfferSort,
): T[] {
	return [...offers].sort((a, b) => {
		if (sort === 'availability') {
			const byStock = stockRank(a.stock) - stockRank(b.stock)
			if (byStock !== 0) return byStock
		}
		if (a.priceCents === null && b.priceCents === null) return 0
		if (a.priceCents === null) return 1
		if (b.priceCents === null) return -1
		return sort === 'price-desc' ? b.priceCents - a.priceCents : a.priceCents - b.priceCents
	})
}

export function onlyAvailable<T extends Pick<OfferView, 'stock'>>(offers: T[]): T[] {
	return offers.filter((o) => isAvailable(o.stock))
}

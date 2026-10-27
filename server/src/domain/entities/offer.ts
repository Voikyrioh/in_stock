import { STOCK_STATES, type StockState } from '@in-stock/shared'
import { z } from 'zod'

const schema = z.object({
	id: z.string().min(1),
	productId: z.string().min(1),
	shopId: z.string().min(1).max(120),
	url: z.url().max(2000),
	title: z.string().min(1).max(500),
	priceCents: z.number().int().positive().nullable(),
	currency: z.string().length(3),
	stock: z.enum(STOCK_STATES),
	lastCheckedAt: z.date().nullable(),
	lastSuccessAt: z.date().nullable(),
	lastError: z.string().max(60).nullable(),
	createdAt: z.date(),
})

export type OfferProps = z.infer<typeof schema>

export interface OfferReading {
	title: string
	priceCents: number | null
	currency: string
	stock: StockState
}

/** One product sold by one shop at one URL (BR-SCRAPE-005). */
export class Offer {
	private constructor(private readonly props: OfferProps) {}

	static restore(props: OfferProps): Offer {
		return new Offer(schema.parse(props))
	}

	static create(
		fields: Omit<OfferProps, 'lastError' | 'lastCheckedAt' | 'lastSuccessAt' | 'createdAt'>,
		now: Date,
	): Offer {
		return Offer.restore({
			...fields,
			lastError: null,
			lastCheckedAt: now,
			lastSuccessAt: now,
			createdAt: now,
		})
	}

	get id() {
		return this.props.id
	}
	get productId() {
		return this.props.productId
	}
	get shopId() {
		return this.props.shopId
	}
	get url() {
		return this.props.url
	}
	get title() {
		return this.props.title
	}
	get priceCents() {
		return this.props.priceCents
	}
	get currency() {
		return this.props.currency
	}
	get stock() {
		return this.props.stock
	}
	get lastCheckedAt() {
		return this.props.lastCheckedAt
	}
	get lastSuccessAt() {
		return this.props.lastSuccessAt
	}
	get lastError() {
		return this.props.lastError
	}
	get createdAt() {
		return this.props.createdAt
	}
	/** BR-OFFER-004: the last reading failed, the values are the last known ones. */
	get stale() {
		return this.props.lastError !== null
	}

	/**
	 * A successful reading. `changed` is true when price or stock moved: the
	 * caller then keeps a snapshot (BR-OFFER-001). An unknown price in the
	 * reading never erases a known one.
	 */
	withReading(reading: OfferReading, now: Date): { offer: Offer; changed: boolean } {
		const priceCents = reading.priceCents ?? this.props.priceCents
		const currency = reading.priceCents === null ? this.props.currency : reading.currency
		const changed =
			priceCents !== this.props.priceCents ||
			currency !== this.props.currency ||
			reading.stock !== this.props.stock
		const offer = Offer.restore({
			...this.props,
			title: reading.title || this.props.title,
			priceCents,
			currency,
			stock: reading.stock,
			lastCheckedAt: now,
			lastSuccessAt: now,
			lastError: null,
		})
		return { offer, changed }
	}

	/** BR-OFFER-004: a failed reading keeps the last known state. */
	withFailure(kind: string, now: Date): Offer {
		return Offer.restore({ ...this.props, lastCheckedAt: now, lastError: kind.slice(0, 60) })
	}

	toJSON(): OfferProps {
		return { ...this.props }
	}
}

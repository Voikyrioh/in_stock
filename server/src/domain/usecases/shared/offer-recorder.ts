import { DomainError, Logger } from '@Voikyrioh/observability'
import { Offer } from '../../entities/offer'
import { Product } from '../../entities/product'
import type { OfferRepository, ProductRepository } from '../../ports/repositories'
import type { ScrapedOffer } from '../../ports/scraper'
import type { Clock, IdGenerator } from '../../ports/system'
import { groupingKey, normaliseBrand, normaliseGtin, normaliseMpn } from '../../rules/grouping'
import { normaliseOfferUrl } from '../../rules/url'
import { KeyedMutex } from './keyed-mutex'

export interface RecordedOffer {
	offer: Offer
	product: Product
}

/**
 * Turns a reading into a stored offer attached to a product (BR-SEARCH-006),
 * keeping a snapshot whenever price or stock change (BR-OFFER-001).
 */
export class OfferRecorder {
	private readonly byUrl = new KeyedMutex()
	private readonly byProductKey = new KeyedMutex()

	constructor(
		private readonly deps: {
			offers: OfferRepository
			products: ProductRepository
			clock: Clock
			ids: IdGenerator
		},
	) {}

	/** Stores a fresh reading (new offer, or update of the known one). */
	record(shopId: string, reading: ScrapedOffer): Promise<RecordedOffer> {
		const url = normaliseOfferUrl(reading.url)
		return this.byUrl.run(url, async () => {
			const existing = await this.deps.offers.findByUrl(url)
			if (existing) return this.update(existing, reading)
			return this.create(shopId, url, reading)
		})
	}

	/** Cached reading: keeps the stored offer as is when it exists (it may be fresher). */
	async ensure(shopId: string, reading: ScrapedOffer): Promise<RecordedOffer> {
		const url = normaliseOfferUrl(reading.url)
		const existing = await this.deps.offers.findByUrl(url)
		if (existing) {
			const product = await this.deps.products.findById(existing.productId)
			if (product) return { offer: existing, product }
		}
		return this.record(shopId, reading)
	}

	private async update(existing: Offer, reading: ScrapedOffer): Promise<RecordedOffer> {
		const now = this.deps.clock.now()
		const { offer, changed } = existing.withReading(reading, now)
		await this.deps.offers.save(offer, { snapshot: changed })
		const stored = await this.deps.products.findById(offer.productId)
		if (!stored) throw new DomainError(`Offer ${offer.id} has no product`)
		return { offer, product: await this.enrich(stored, reading, now) }
	}

	private async create(shopId: string, url: string, reading: ScrapedOffer): Promise<RecordedOffer> {
		const now = this.deps.clock.now()
		const product = await this.productFor(reading, now)
		const offer = Offer.create(
			{
				id: this.deps.ids.next(),
				productId: product.id,
				shopId,
				url,
				title: reading.title.slice(0, 500),
				priceCents: reading.priceCents,
				currency: reading.currency,
				stock: reading.stock,
			},
			now,
		)
		await this.deps.offers.save(offer, { snapshot: true })
		return { offer, product }
	}

	private async productFor(reading: ScrapedOffer, now: Date): Promise<Product> {
		const key = groupingKey(reading)
		if (!key) return this.newProduct(reading, now)
		const lockKey = key.kind === 'gtin' ? `gtin:${key.gtin}` : `mpn:${key.brand}:${key.mpn}`
		return this.byProductKey.run(lockKey, async () => {
			const found =
				key.kind === 'gtin'
					? await this.deps.products.findByGtin(key.gtin)
					: await this.deps.products.findByBrandMpn(key.brand, key.mpn)
			return found ? this.enrich(found, reading, now) : this.newProduct(reading, now)
		})
	}

	private async newProduct(reading: ScrapedOffer, now: Date): Promise<Product> {
		const product = Product.create(
			{
				id: this.deps.ids.next(),
				name: reading.title.slice(0, 500),
				...identity(reading),
			},
			now,
		)
		await this.deps.products.save(product)
		return product
	}

	private async enrich(product: Product, reading: ScrapedOffer, now: Date): Promise<Product> {
		const enriched = product.enrich(identity(reading), now)
		if (enriched === product) return product
		try {
			await this.deps.products.save(enriched)
			return enriched
		} catch (error) {
			// Enrichment is best effort: a GTIN already owned by another product stays unset.
			Logger.warn({ err: error, productId: product.id }, 'Product not enriched')
			return product
		}
	}
}

function identity(reading: ScrapedOffer) {
	let imageUrl: string | null = null
	if (
		reading.imageUrl &&
		/^https?:\/\//.test(reading.imageUrl) &&
		reading.imageUrl.length <= 2000
	) {
		imageUrl = reading.imageUrl
	}
	return {
		brand: normaliseBrand(reading.brand),
		gtin: normaliseGtin(reading.gtin),
		mpn: normaliseMpn(reading.mpn),
		imageUrl,
	}
}

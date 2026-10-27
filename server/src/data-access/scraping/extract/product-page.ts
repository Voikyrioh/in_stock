import type { StockState } from '@in-stock/shared'
import { type CheerioAPI, load } from 'cheerio'
import { parseCurrency, parsePrice } from '../../../domain/rules/price'
import { isReadableProduct } from '../../../domain/rules/product'
import { stockFromAvailability, stockFromText } from '../../../domain/rules/stock'
import { absoluteUrl, cleanText, jsonLdNodes, typesOf } from './html'

export interface ProductSelectors {
	title?: string
	price?: string
	stock?: string
	image?: string
}

export interface ExtractedProduct {
	title: string | null
	priceCents: number | null
	currency: string
	stock: StockState
	brand: string | null
	gtin: string | null
	mpn: string | null
	imageUrl: string | null
	/** Which strategies gave something (diagnostics, probe tool). */
	sources: string[]
}

type Layer = Pick<
	ExtractedProduct,
	'title' | 'priceCents' | 'brand' | 'gtin' | 'mpn' | 'imageUrl'
> & {
	currency: string | null
	stock: StockState
}

const EMPTY: Layer = {
	title: null,
	priceCents: null,
	currency: null,
	stock: 'unknown',
	brand: null,
	gtin: null,
	mpn: null,
	imageUrl: null,
}

/**
 * ADR-0002 — extraction cascade, field by field: JSON-LD, then microdata, then
 * OpenGraph, then the shop's own selectors, then French/English text clues.
 * Structured data first because it changes far less often than the layout and
 * works on shops we have never seen.
 */
export function extractProduct(
	html: string,
	pageUrl: string,
	selectors?: ProductSelectors,
): ExtractedProduct {
	const $ = load(html)
	const layers: [string, Layer][] = [
		['json-ld', fromJsonLd($, pageUrl)],
		['microdata', fromMicrodata($, pageUrl)],
		['opengraph', fromOpenGraph($, pageUrl)],
		['selectors', fromSelectors($, pageUrl, selectors)],
		['text', fromText($)],
	]
	const result: Layer = { ...EMPTY }
	const sources: string[] = []
	for (const [name, layer] of layers) {
		let used = false
		for (const key of Object.keys(EMPTY) as (keyof Layer)[]) {
			const value = layer[key]
			const missing = key === 'stock' ? result.stock === 'unknown' : result[key] === null
			const present = key === 'stock' ? value !== 'unknown' : value !== null
			if (missing && present) {
				;(result as Record<string, unknown>)[key] = value
				used = true
			}
		}
		if (used) sources.push(name)
	}
	return { ...result, currency: result.currency ?? 'EUR', sources }
}

/** BR-SCRAPE-004, see domain/rules/product.ts. */
export function isProduct(product: ExtractedProduct): boolean {
	return isReadableProduct(product)
}

// ---------- JSON-LD ----------

const PRODUCT_TYPES = ['product', 'productgroup', 'individualproduct', 'productmodel', 'vehicle']

function fromJsonLd($: CheerioAPI, pageUrl: string): Layer {
	const products = jsonLdNodes($).filter((node) =>
		typesOf(node).some((t) => PRODUCT_TYPES.includes(t)),
	)
	if (products.length === 0) return { ...EMPTY }
	const page = stripQuery(pageUrl)
	let product =
		products.find((p) => samePage(p.url, pageUrl)) ?? (products[0] as Record<string, unknown>)
	// ProductGroup: the variant of this exact URL (query included: ?color=black), else the first one.
	const variants = asArray(product.hasVariant).filter(isObject)
	if (variants.length > 0) {
		const variant =
			variants.find((v) => sameUrl(v.url, pageUrl)) ??
			variants.find((v) => samePage(v.url, pageUrl)) ??
			variants[0]
		if (variant) product = { ...product, ...variant, name: variant.name ?? product.name }
	}
	const offer = pickOffer(product.offers, page)
	const priceSpec = asArray(offer?.priceSpecification).filter(isObject)[0]
	const rawPrice = offer?.price ?? offer?.lowPrice ?? priceSpec?.price
	return {
		title: cleanText(product.name),
		priceCents: parsePrice(rawPrice),
		currency: str(offer?.priceCurrency ?? priceSpec?.priceCurrency),
		stock: stockFromAvailability(offer?.availability ?? product.availability),
		brand: brandName(product.brand ?? product.manufacturer),
		gtin: str(
			product.gtin13 ??
				product.gtin ??
				product.gtin14 ??
				product.gtin12 ??
				product.gtin8 ??
				product.ean ??
				offer?.gtin13 ??
				offer?.gtin,
		),
		mpn: str(product.mpn ?? offer?.mpn),
		imageUrl: imageOf(product.image, pageUrl),
	}
}

function pickOffer(raw: unknown, page: string): Record<string, unknown> | undefined {
	const offers: Record<string, unknown>[] = []
	for (const item of asArray(raw).filter(isObject)) {
		// AggregateOffer may nest the real offers.
		const nested = asArray(item.offers).filter(isObject)
		offers.push(...(nested.length ? nested : [item]))
	}
	return (
		offers.find((o) => stripQuery(String(o.url ?? '')) === page && o.price !== undefined) ??
		offers.find((o) => o.price !== undefined || o.lowPrice !== undefined) ??
		offers[0]
	)
}

// ---------- Microdata ----------

function fromMicrodata($: CheerioAPI, pageUrl: string): Layer {
	const scope = $('[itemtype*="schema.org/Product" i]').first()
	if (scope.length === 0) return { ...EMPTY }
	const prop = (name: string) => {
		const el = scope.find(`[itemprop="${name}"]`).first()
		if (el.length === 0) return null
		return el.attr('content') ?? el.attr('href') ?? el.attr('src') ?? el.attr('value') ?? el.text()
	}
	const brandEl = scope.find('[itemprop="brand"]').first()
	const brand =
		brandEl.find('[itemprop="name"]').first().text() || brandEl.attr('content') || brandEl.text()
	return {
		title: cleanText(
			scope.find('[itemprop="name"]').first().attr('content') ??
				scope.find('[itemprop="name"]').first().text(),
		),
		priceCents: parsePrice(prop('price')),
		currency: str(prop('priceCurrency')),
		stock: stockFromAvailability(prop('availability')),
		brand: cleanText(brand),
		gtin: str(prop('gtin13') ?? prop('gtin') ?? prop('gtin14') ?? prop('gtin12') ?? prop('gtin8')),
		mpn: str(prop('mpn')),
		imageUrl: absoluteUrl(prop('image'), pageUrl),
	}
}

// ---------- OpenGraph / meta ----------

function fromOpenGraph($: CheerioAPI, pageUrl: string): Layer {
	const meta = (...names: string[]) => {
		for (const name of names) {
			const value = $(`meta[property="${name}"], meta[name="${name}"]`).first().attr('content')
			if (value?.trim()) return value.trim()
		}
		return null
	}
	const ogType = meta('og:type')
	const hasProductMeta = Boolean(
		meta('product:price:amount', 'og:price:amount', 'product:availability', 'og:availability'),
	)
	if (!hasProductMeta && ogType?.toLowerCase() !== 'product') return { ...EMPTY }
	const amount = meta('product:price:amount', 'og:price:amount')
	return {
		title: cleanText(meta('og:title', 'twitter:title')),
		priceCents: parsePrice(amount),
		currency: str(meta('product:price:currency', 'og:price:currency')),
		stock: stockFromAvailability(meta('product:availability', 'og:availability')),
		brand: cleanText(meta('product:brand', 'og:brand')),
		gtin: str(meta('product:ean', 'product:gtin', 'product:upc')),
		mpn: str(meta('product:mfr_part_no')),
		imageUrl: absoluteUrl(meta('og:image', 'og:image:secure_url'), pageUrl),
	}
}

// ---------- Shop selectors ----------

function fromSelectors($: CheerioAPI, pageUrl: string, selectors?: ProductSelectors): Layer {
	if (!selectors) return { ...EMPTY }
	const text = (selector?: string) => (selector ? cleanText($(selector).first().text()) : null)
	const priceText = text(selectors.price)
	const image = selectors.image ? $(selectors.image).first() : null
	return {
		...EMPTY,
		title: text(selectors.title),
		priceCents: parsePrice(priceText),
		currency: priceText ? parseCurrency(priceText) : null,
		stock: stockFromText(text(selectors.stock)),
		imageUrl: absoluteUrl(image?.attr('data-src') ?? image?.attr('src'), pageUrl),
	}
}

// ---------- Text clues ----------

const STOCK_HINTS =
	'[class*="stock" i], [class*="availability" i], [class*="dispo" i], [id*="stock" i], [id*="availability" i], [data-stock]'

function fromText($: CheerioAPI): Layer {
	let stock: StockState = 'unknown'
	$(STOCK_HINTS).each((_, el) => {
		const value = cleanText($(el).html())
		if (!value || value.length > 120) return
		stock = stockFromText(value)
		if (stock !== 'unknown') return false
	})
	return {
		...EMPTY,
		title: cleanText($('h1').first().text()) ?? cleanText($('title').text()),
		stock,
	}
}

// ---------- helpers ----------

function str(value: unknown): string | null {
	if (typeof value === 'number') return String(value)
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	return trimmed ? trimmed : null
}

function asArray(value: unknown): unknown[] {
	if (value === undefined || value === null) return []
	return Array.isArray(value) ? value : [value]
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function brandName(value: unknown): string | null {
	const first = asArray(value)[0]
	if (isObject(first)) return cleanText(first.name)
	return cleanText(first)
}

function imageOf(value: unknown, pageUrl: string): string | null {
	const first = asArray(value)[0]
	if (isObject(first)) return absoluteUrl(str(first.url ?? first.contentUrl), pageUrl)
	return absoluteUrl(str(first), pageUrl)
}

function sameUrl(candidate: unknown, pageUrl: string): boolean {
	try {
		const a = new URL(String(candidate), pageUrl)
		const b = new URL(pageUrl)
		return stripQuery(a.toString()) === stripQuery(b.toString()) && a.search === b.search
	} catch {
		return false
	}
}

function samePage(candidate: unknown, pageUrl: string): boolean {
	return typeof candidate === 'string' && stripQuery(candidate) === stripQuery(pageUrl)
}

function stripQuery(url: string): string {
	try {
		const u = new URL(url)
		return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`
	} catch {
		return url
	}
}

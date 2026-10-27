import type { StockState } from '@in-stock/shared'
import { type Cheerio, type CheerioAPI, load } from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { parseCurrency, parsePrice } from '../../../domain/rules/price'
import { stockFromAvailability, stockFromText } from '../../../domain/rules/stock'
import { normaliseOfferUrl } from '../../../domain/rules/url'
import { absoluteUrl, cleanText, jsonLdNodes, typesOf } from './html'

export interface ListingSelectors {
	/** One result card. */
	item: string
	/** Link to the product page inside the card; the card itself when omitted and it is a link. */
	link?: string
	title?: string
	price?: string
	stock?: string
	image?: string
}

export interface ListedOffer {
	url: string
	title: string
	priceCents: number | null
	currency: string
	stock: StockState
	imageUrl: string | null
}

export interface ListingContext {
	pageUrl: string
	/** Hosts of the shop: links to other sites (ads, marketplaces) are ignored. */
	hosts: string[]
	productUrlPattern: RegExp
	selectors?: ListingSelectors
	limit: number
}

/**
 * Offers of a search result page. Three strategies, first non-empty wins:
 * JSON-LD ItemList, the shop's card selectors, then any link that looks like a
 * product page of this shop (with price and stock read around it).
 */
export function extractListing(
	html: string,
	ctx: ListingContext,
): { offers: ListedOffer[]; strategy: string } {
	const $ = load(html)
	const strategies: [string, () => ListedOffer[]][] = [
		['json-ld', () => fromItemList($, ctx)],
		['selectors', () => fromSelectors($, ctx)],
		['links', () => fromLinks($, ctx)],
	]
	for (const [strategy, run] of strategies) {
		const offers = dedupe(
			run().filter((o) => belongsToShop(o.url, ctx)),
			ctx.limit,
		)
		if (offers.length > 0) return { offers, strategy }
	}
	return { offers: [], strategy: 'none' }
}

function belongsToShop(url: string, ctx: ListingContext): boolean {
	try {
		const host = new URL(url).hostname.toLowerCase()
		return ctx.hosts.includes(host) && ctx.productUrlPattern.test(url)
	} catch {
		return false
	}
}

function dedupe(offers: ListedOffer[], limit: number): ListedOffer[] {
	const seen = new Map<string, ListedOffer>()
	for (const offer of offers) {
		const key = normaliseOfferUrl(offer.url)
		const known = seen.get(key)
		if (!known) {
			if (seen.size >= limit) break
			seen.set(key, { ...offer, url: key })
			continue
		}
		if (known.priceCents === null && offer.priceCents !== null)
			seen.set(key, { ...offer, url: key })
	}
	return [...seen.values()]
}

function fromItemList($: CheerioAPI, ctx: ListingContext): ListedOffer[] {
	const lists = jsonLdNodes($).filter((n) => typesOf(n).includes('itemlist'))
	const offers: ListedOffer[] = []
	for (const list of lists) {
		const elements = Array.isArray(list.itemListElement) ? list.itemListElement : []
		for (const element of elements as Record<string, unknown>[]) {
			const item = (
				typeof element.item === 'object' && element.item ? element.item : element
			) as Record<string, unknown>
			const url = absoluteUrl(String(item.url ?? element.url ?? ''), ctx.pageUrl)
			const title = cleanText(item.name ?? element.name)
			if (!url || !title) continue
			const offer = (Array.isArray(item.offers) ? item.offers[0] : item.offers) as
				| Record<string, unknown>
				| undefined
			const image = Array.isArray(item.image) ? item.image[0] : item.image
			offers.push({
				url,
				title,
				priceCents: parsePrice(offer?.price ?? offer?.lowPrice),
				currency: parseCurrency(offer?.priceCurrency),
				stock: stockFromAvailability(offer?.availability),
				imageUrl: absoluteUrl(typeof image === 'string' ? image : null, ctx.pageUrl),
			})
		}
	}
	return offers
}

function fromSelectors($: CheerioAPI, ctx: ListingContext): ListedOffer[] {
	const selectors = ctx.selectors
	if (!selectors) return []
	const offers: ListedOffer[] = []
	$(selectors.item).each((_, el) => {
		const card = $(el)
		const link = selectors.link
			? card.find(selectors.link).first()
			: card.is('a')
				? card
				: card.find('a[href]').first()
		const url = absoluteUrl(link.attr('href'), ctx.pageUrl)
		const title = cleanText(
			selectors.title
				? card.find(selectors.title).first().text()
				: (link.attr('title') ?? link.text()),
		)
		if (!url || !title) return
		const priceText = selectors.price ? cleanText(card.find(selectors.price).first().text()) : null
		offers.push({
			url,
			title,
			priceCents: parsePrice(priceText),
			currency: parseCurrency(priceText),
			// No stock selector: the card's own wording ("En stock", "Rupture de stock").
			stock: selectors.stock
				? stockFromCard(card.find(selectors.stock).first())
				: stockFromText(cleanText(card.html())),
			imageUrl: imageOf(card.find(selectors.image ?? 'img').first(), ctx.pageUrl),
		})
	})
	return offers
}

/** Stock is often a class (LDLC: "stock-1", "stock-9") as much as a label. */
function stockFromCard(el: Cheerio<AnyNode>): StockState {
	const fromLabel = stockFromText(
		cleanText(el.text()) ?? el.attr('title') ?? el.attr('aria-label') ?? '',
	)
	if (fromLabel !== 'unknown') return fromLabel
	const classes = `${el.attr('class') ?? ''} ${el.find('[class]').attr('class') ?? ''}`
	const ldlc = /\bstock-(\d+)\b/.exec(classes)?.[1]
	if (ldlc === '1') return 'in_stock'
	if (ldlc === '9') return 'out_of_stock'
	if (ldlc) return 'backorder'
	return 'unknown'
}

function imageOf(img: Cheerio<AnyNode>, base: string): string | null {
	const srcset = img.attr('data-srcset') ?? img.attr('srcset')
	const fromSet = srcset?.split(',')[0]?.trim().split(' ')[0]
	return absoluteUrl(
		img.attr('data-src') ?? img.attr('data-lazy-src') ?? img.attr('src') ?? fromSet,
		base,
	)
}

const PRICE_IN_TEXT = /\d[\d   .]*(?:[,.]\d{2})?\s*€(?:\s*\d{2})?|€\s*\d[\d .,]*/

const PICTURE_CLASS = /img|image|picture|photo|visuel|vignette/i

/** Last resort: links to product pages, with price and stock read in their nearest card. */
function fromLinks($: CheerioAPI, ctx: ListingContext): ListedOffer[] {
	const offers: ListedOffer[] = []
	$('a[href]').each((_, el) => {
		const link = $(el)
		const url = absoluteUrl(link.attr('href'), ctx.pageUrl)
		if (!url || !belongsToShop(url, ctx)) return
		// Picture link of a card (or its "Pas d'image disponible" placeholder): only the picture names the product.
		const picture =
			link.attr('aria-hidden') === 'true' ||
			link.attr('tabindex') === '-1' ||
			link.find('img').length > 0 ||
			PICTURE_CLASS.test(`${link.attr('class') ?? ''} ${link.find('[class]').attr('class') ?? ''}`)
		const title = picture
			? cleanText(link.find('img').attr('alt'))
			: (cleanText(link.attr('title') ?? link.text()) ?? cleanText(link.find('img').attr('alt')))
		if (!title || title.length < 8) return
		const card = nearestCard($, el)
		const text = cleanText(card?.html()) ?? ''
		const priceText = PRICE_IN_TEXT.exec(text)?.[0] ?? null
		offers.push({
			url,
			title,
			priceCents: parsePrice(priceText),
			currency: parseCurrency(priceText),
			stock: stockFromText(text),
			imageUrl: card ? imageOf(card.find('img').first(), ctx.pageUrl) : null,
		})
	})
	return offers
}

/** Smallest ancestor (4 levels max) that holds a price, and still looks like one card. */
function nearestCard($: CheerioAPI, el: Element): Cheerio<Element> | null {
	let current = $(el)
	for (let level = 0; level < 4; level++) {
		const parent = current.parent()
		if (parent.length === 0) break
		const text = parent.text()
		if (text.length > 800) break
		current = parent as Cheerio<Element>
		if (PRICE_IN_TEXT.test(text)) return current
	}
	return null
}

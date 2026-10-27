import { expect } from 'chai'
import { isValidEmail, isValidPassword, normaliseEmail } from '../account'
import { canFollowMore, compareFollows } from '../follows'
import { groupingKey, normaliseGtin } from '../grouping'
import { bestOffer, compareOffers, isDue, refreshCooldownLeft } from '../offers'
import { parseCurrency, parsePrice } from '../price'
import { cleanQuery, looksLikeUrl, queryKey } from '../query'
import { robotsScope } from '../robots'
import { shopState } from '../shop-state'
import { stockFromAvailability, stockFromText } from '../stock'
import { checkUrlShape, normaliseOfferUrl, shopNameFromHost } from '../url'

describe('BR-PRICE-001/002 parsePrice', () => {
	const cases: [unknown, number | null][] = [
		['599,95 €', 59995],
		['1 299,95 €', 129995],
		['1 299,95 €', 129995],
		['599€95', 59995],
		['1 299€95', 129995],
		['1.299,95', 129995],
		['1,299.95', 129995],
		['1299.95', 129995],
		['€ 619,00', 61900],
		['€ 1.029,00', 102900],
		['1.299', 129900],
		['49 €', 4900],
		[599.95, 59995],
		['Gratuit', null],
		['', null],
		['0,00 €', null],
		['12,345,67', null],
		[null, null],
		[{}, null],
	]
	for (const [input, expected] of cases) {
		it(`should read ${JSON.stringify(input)} as ${expected}`, () => {
			expect(parsePrice(input)).to.equal(expected)
		})
	}

	it('should detect the currency', () => {
		expect(parseCurrency('599,95 €')).to.equal('EUR')
		expect(parseCurrency('usd')).to.equal('USD')
		expect(parseCurrency('£ 12')).to.equal('GBP')
		expect(parseCurrency(undefined)).to.equal('EUR')
	})
})

describe('BR-STOCK-002 stock mapping', () => {
	it('should map schema.org availability URLs and short forms', () => {
		expect(stockFromAvailability('https://schema.org/InStock')).to.equal('in_stock')
		expect(stockFromAvailability('http://schema.org/OutOfStock')).to.equal('out_of_stock')
		expect(stockFromAvailability('PreOrder')).to.equal('preorder')
		expect(stockFromAvailability('BackOrder')).to.equal('backorder')
		expect(stockFromAvailability('LimitedAvailability')).to.equal('limited')
		expect(stockFromAvailability('Discontinued')).to.equal('discontinued')
		expect(stockFromAvailability('oos')).to.equal('out_of_stock')
		expect(stockFromAvailability('in stock')).to.equal('in_stock')
		expect(stockFromAvailability(42)).to.equal('unknown')
	})

	const texts: [string, string][] = [
		['En stock', 'in_stock'],
		['Expédié sous 24h', 'in_stock'],
		['Rupture de stock', 'out_of_stock'],
		['Indisponible', 'out_of_stock'],
		['Produit épuisé', 'out_of_stock'],
		['Précommande, expédition le 12/11', 'preorder'],
		['En réapprovisionnement', 'backorder'],
		['Disponible sous 3 semaines', 'backorder'],
		['Plus que 2 en stock', 'limited'],
		['Derniers articles', 'limited'],
		["Ce produit n'est plus commercialisé", 'discontinued'],
		['Couleur noire', 'unknown'],
	]
	for (const [text, state] of texts) {
		it(`should read « ${text} » as ${state}`, () => expect(stockFromText(text)).to.equal(state))
	}
})

describe('BR-SEARCH-001 query', () => {
	it('should clean and bound the query', () => {
		expect(cleanQuery('  rtx   4070 ')).to.equal('rtx 4070')
		expect(cleanQuery('a')).to.equal(null)
		expect(cleanQuery('x'.repeat(101))).to.equal(null)
		expect(queryKey('RTX 4070')).to.equal(queryKey('rtx 4070'))
	})

	it('should recognise a pasted link', () => {
		expect(looksLikeUrl(' https://www.ldlc.com/fiche/PB1.html')).to.equal(true)
		expect(looksLikeUrl('rtx 4070')).to.equal(false)
	})
})

describe('BR-SCRAPE-003/005 links', () => {
	it('should accept http(s) links on the default port only', () => {
		expect(checkUrlShape('https://www.ldlc.com/fiche/PB1.html').ok).to.equal(true)
		expect(checkUrlShape('pas-un-lien')).to.deep.equal({ ok: false, problem: 'format' })
		expect(checkUrlShape('ftp://exemple.fr/produit')).to.deep.equal({
			ok: false,
			problem: 'format',
		})
		expect(checkUrlShape('https://exemple.fr:8443/p')).to.deep.equal({
			ok: false,
			problem: 'forbidden',
		})
		expect(checkUrlShape('https://user:pass@exemple.fr/p')).to.deep.equal({
			ok: false,
			problem: 'forbidden',
		})
		expect(checkUrlShape('http://intranet/p')).to.deep.equal({ ok: false, problem: 'forbidden' })
	})

	it('should drop tracking parameters and fragments', () => {
		expect(
			normaliseOfferUrl('https://WWW.LDLC.com/fiche/PB1.html?utm_source=x&gclid=1#avis'),
		).to.equal('https://www.ldlc.com/fiche/PB1.html')
		expect(normaliseOfferUrl('https://shop.fr/p?id=3&ref=abc&color=red')).to.equal(
			'https://shop.fr/p?color=red&id=3',
		)
	})

	it('should reduce Amazon links to their ASIN', () => {
		expect(
			normaliseOfferUrl(
				'https://www.amazon.fr/MSI-RTX/dp/b0cs6v4vxq/ref=sr_1_3?keywords=rtx&tag=x-21',
			),
		).to.equal('https://www.amazon.fr/dp/B0CS6V4VXQ')
	})

	it('should name an unlisted shop by its host (BR-SHOP-002)', () => {
		expect(shopNameFromHost('www.boutique.fr')).to.equal('boutique.fr')
	})
})

describe('BR-SEARCH-006 grouping', () => {
	it('should validate and pad GTINs', () => {
		expect(normaliseGtin('4711377157834')).to.equal('04711377157834')
		expect(normaliseGtin('4711377157835')).to.equal(null)
		expect(normaliseGtin('0000000000000')).to.equal(null)
		expect(normaliseGtin('abc')).to.equal(null)
	})

	it('should prefer the GTIN, then brand + reference', () => {
		expect(groupingKey({ gtin: '4711377157834', brand: 'MSI', mpn: 'X' })).to.deep.equal({
			kind: 'gtin',
			gtin: '04711377157834',
		})
		expect(groupingKey({ brand: ' MSI ', mpn: '912-v513 618' })).to.deep.equal({
			kind: 'mpn',
			brand: 'msi',
			mpn: '912-V513618',
		})
		expect(groupingKey({ brand: 'MSI' })).to.equal(null)
	})
})

describe('BR-SEARCH-005 / BR-OFFER-005 offers', () => {
	const offer = (stock: string, priceCents: number | null, currency = 'EUR') =>
		({ stock, priceCents, currency }) as Parameters<typeof compareOffers>[0]

	it('should sort by availability then price, unknown prices last', () => {
		const list = [
			offer('out_of_stock', 100),
			offer('in_stock', null),
			offer('in_stock', 500),
			offer('limited', 300),
		]
		const sorted = [...list].sort((a, b) => compareOffers(a, b))
		expect(sorted.map((o) => [o.stock, o.priceCents])).to.deep.equal([
			['in_stock', 500],
			['in_stock', null],
			['limited', 300],
			['out_of_stock', 100],
		])
		const byPrice = [...list].sort((a, b) => compareOffers(a, b, 'price-asc'))
		expect(byPrice.map((o) => o.priceCents)).to.deep.equal([100, 300, 500, null])
	})

	it('should pick the cheapest available offer in euros', () => {
		expect(
			bestOffer([offer('out_of_stock', 100), offer('in_stock', 600), offer('limited', 590)])
				?.priceCents,
		).to.equal(590)
		expect(bestOffer([offer('in_stock', null), offer('in_stock', 10, 'USD')])).to.equal(null)
	})

	it('should know when an offer is due (30 min) and the refresh cooldown (2 min)', () => {
		const now = new Date('2026-10-27T12:00:00Z')
		expect(isDue(null, now)).to.equal(true)
		expect(isDue(new Date('2026-10-27T11:31:00Z'), now)).to.equal(false)
		expect(isDue(new Date('2026-10-27T11:30:00Z'), now)).to.equal(true)
		expect(refreshCooldownLeft([new Date('2026-10-27T11:59:00Z')], now)).to.equal(60_000)
		expect(refreshCooldownLeft([new Date('2026-10-27T11:59:00Z'), null], now)).to.equal(0)
		expect(refreshCooldownLeft([], now)).to.equal(0)
	})
})

describe('BR-SHOP-001 shop state', () => {
	const now = new Date('2026-10-27T12:00:00Z')
	const facts = {
		lastSuccessAt: now,
		lastFailureAt: null,
		consecutiveFailures: 0,
		pausedUntil: null,
		robotsForbidden: false,
	}
	it('should derive the state', () => {
		expect(shopState(null, now)).to.equal('unknown')
		expect(shopState(facts, now)).to.equal('operational')
		expect(shopState({ ...facts, consecutiveFailures: 2 }, now)).to.equal('degraded')
		expect(shopState({ ...facts, consecutiveFailures: 3 }, now)).to.equal('down')
		expect(shopState({ ...facts, pausedUntil: new Date('2026-10-27T12:05:00Z') }, now)).to.equal(
			'down',
		)
		expect(shopState({ ...facts, robotsForbidden: true }, now)).to.equal('forbidden')
		expect(shopState({ ...facts, lastSuccessAt: null }, now)).to.equal('unknown')
	})
})

describe('BR-FOLLOW / BR-ACCOUNT rules', () => {
	it('should cap follows at 100', () => {
		expect(canFollowMore(99)).to.equal(true)
		expect(canFollowMore(100)).to.equal(false)
	})

	it('should sort follows: in stock, best price, newest', () => {
		const at = (iso: string) => new Date(iso)
		const rows = [
			{ id: 'a', inStockCount: 0, bestPriceCents: null, followedAt: at('2026-10-01') },
			{ id: 'b', inStockCount: 2, bestPriceCents: 500, followedAt: at('2026-10-01') },
			{ id: 'c', inStockCount: 1, bestPriceCents: 300, followedAt: at('2026-10-01') },
			{ id: 'd', inStockCount: 0, bestPriceCents: null, followedAt: at('2026-10-05') },
		]
		expect(rows.sort(compareFollows).map((r) => r.id)).to.deep.equal(['c', 'b', 'd', 'a'])
	})

	it('should normalise and validate credentials', () => {
		expect(normaliseEmail('  Voiky@Exemple.FR ')).to.equal('voiky@exemple.fr')
		expect(isValidEmail('voiky@exemple.fr')).to.equal(true)
		expect(isValidEmail('voiky')).to.equal(false)
		expect(isValidPassword('court')).to.equal(false)
		expect(isValidPassword('motdepasse12')).to.equal(true)
		expect(isValidPassword('x'.repeat(129))).to.equal(false)
	})
})

describe('BR-SCRAPE-001 robots.txt scope', () => {
	it('should apply every group to the scheduler and named groups only to a person', () => {
		expect(robotsScope('schedule')).to.equal('every-group')
		expect(robotsScope('user')).to.equal('named-group-only')
	})
})

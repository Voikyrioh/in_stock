import { expect } from 'chai'
import {
	ALTERNATE_SEARCH,
	ITEMLIST_SEARCH,
	LDLC_PRODUCT,
	LDLC_SEARCH,
	LINKS_ONLY_SEARCH,
	MICRODATA_PRODUCT,
	NOT_A_PRODUCT,
	OPENGRAPH_PRODUCT,
	PRODUCT_GROUP,
	TEXT_ONLY_PRODUCT,
} from '../../../__tests__/support/fixtures'
import { extractListing } from '../extract/listing'
import { extractProduct, isProduct } from '../extract/product-page'
import { SHOPS } from '../shops/definitions'

const shop = (id: string) => SHOPS.find((s) => s.id === id) as (typeof SHOPS)[number]

describe('Product page extraction (ADR-0002 cascade)', () => {
	it('should read a schema.org JSON-LD product', () => {
		const p = extractProduct(
			LDLC_PRODUCT,
			'https://www.ldlc.com/fiche/PB00561234.html',
			shop('ldlc').product,
		)
		expect(p).to.include({
			title: 'MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC',
			priceCents: 59995,
			currency: 'EUR',
			stock: 'in_stock',
			brand: 'MSI',
			gtin: '4711377157834',
			mpn: '912-V513-618',
		})
		expect(p.imageUrl).to.match(/^https:\/\/media\.ldlc\.com\//)
		expect(p.sources[0]).to.equal('json-ld')
		expect(isProduct(p)).to.equal(true)
	})

	it('should pick the variant of the page in a ProductGroup', () => {
		const p = extractProduct(PRODUCT_GROUP, 'https://boutique.example.fr/north?color=black')
		expect(p).to.include({
			title: 'Fractal North Charcoal Black',
			priceCents: 12990,
			stock: 'backorder',
			brand: 'Fractal Design',
		})
	})

	it('should read microdata', () => {
		const p = extractProduct(MICRODATA_PRODUCT, 'https://shop.example.fr/ram')
		expect(p).to.include({
			title: 'Corsair Vengeance DDR5 32 Go (2x16) 6000 MHz',
			priceCents: 10990,
			stock: 'limited',
			brand: 'Corsair',
		})
		expect(p.mpn).to.equal('CMK32GX5M2B6000C30')
	})

	it('should read OpenGraph product tags and resolve the image', () => {
		const p = extractProduct(OPENGRAPH_PRODUCT, 'https://shop.example.fr/ssd/990')
		expect(p).to.include({
			title: 'Samsung 990 PRO 2 To',
			priceCents: 16999,
			stock: 'out_of_stock',
		})
		expect(p.imageUrl).to.equal('https://shop.example.fr/img/990pro.jpg')
	})

	it('should fall back to text clues and shop selectors', () => {
		const p = extractProduct(TEXT_ONLY_PRODUCT, 'https://shop.example.fr/b650', { price: '.prix' })
		expect(p).to.include({
			title: 'ASUS TUF GAMING B650-PLUS WIFI',
			priceCents: 18999,
			stock: 'preorder',
		})
	})

	it('should refuse a page without product (BR-SCRAPE-004)', () => {
		expect(isProduct(extractProduct(NOT_A_PRODUCT, 'https://shop.example.fr/'))).to.equal(false)
	})
})

describe('Search page extraction', () => {
	const ctx = (id: string, pageUrl: string) => {
		const s = shop(id)
		return {
			pageUrl,
			hosts: s.hosts,
			productUrlPattern: s.productUrlPattern,
			selectors: s.listing,
			limit: 10,
		}
	}

	it('should read LDLC cards, prices like 599€95 and stock classes', () => {
		const { offers, strategy } = extractListing(
			LDLC_SEARCH,
			ctx('ldlc', 'https://www.ldlc.com/recherche/rtx%204070/'),
		)
		expect(strategy).to.equal('selectors')
		expect(offers).to.have.length(2)
		expect(offers[0]).to.include({
			url: 'https://www.ldlc.com/fiche/PB00561234.html',
			title: 'MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC',
			priceCents: 59995,
			stock: 'in_stock',
			imageUrl: 'https://media.ldlc.com/a.jpg',
		})
		expect(offers[1]).to.include({ priceCents: 57990, stock: 'out_of_stock' })
	})

	it('should read cards that are links themselves (Alternate)', () => {
		const { offers } = extractListing(
			ALTERNATE_SEARCH,
			ctx('alternate', 'https://www.alternate.fr/listing.xhtml?q=rtx'),
		)
		expect(offers.map((o) => [o.priceCents, o.stock])).to.deep.equal([
			[61900, 'in_stock'],
			[102900, 'backorder'],
		])
	})

	it('should prefer a JSON-LD ItemList', () => {
		const { offers, strategy } = extractListing(
			ITEMLIST_SEARCH,
			ctx('materielnet', 'https://www.materiel.net/recherche/ryzen/'),
		)
		expect(strategy).to.equal('json-ld')
		expect(offers[0]).to.include({
			title: 'AMD Ryzen 7 9800X3D',
			priceCents: 52900,
			stock: 'preorder',
		})
		expect(offers[1]).to.include({ title: 'AMD Ryzen 7 9700X', priceCents: null, stock: 'unknown' })
	})

	it('should fall back to product links with the price around them', () => {
		const { offers, strategy } = extractListing(LINKS_ONLY_SEARCH, {
			...ctx('boulanger', 'https://www.boulanger.com/resultats?tr=8to'),
			selectors: undefined,
		})
		expect(strategy).to.equal('links')
		expect(offers.map((o) => [o.url, o.priceCents, o.stock])).to.deep.equal([
			['https://www.boulanger.com/ref/1189321', 22999, 'in_stock'],
			['https://www.boulanger.com/ref/1189322', 20999, 'out_of_stock'],
		])
	})

	it('should cap the offers per shop (BR-SEARCH-004)', () => {
		const many = `<ul>${Array.from({ length: 15 }, (_, i) => `<li class="pdt-item"><h3 class="title-3"><a href="/fiche/PB${1000 + i}.html">Produit numéro ${i}</a></h3></li>`).join('')}</ul>`
		expect(
			extractListing(many, ctx('ldlc', 'https://www.ldlc.com/recherche/x/')).offers,
		).to.have.length(10)
	})
})

describe('Shop definitions', () => {
	it('should have unique ids and build search URLs that match their own hosts', () => {
		expect(new Set(SHOPS.map((s) => s.id)).size).to.equal(SHOPS.length)
		for (const s of SHOPS) {
			if (!s.searchUrl) continue
			const url = new URL(s.searchUrl('rtx 4070'))
			expect(s.hosts, s.id).to.include(url.hostname)
			expect(url.protocol).to.equal('https:')
			expect(url.toString()).to.not.include(' ')
		}
	})

	it('should tell Grosbill and Cybertek product pages from their categories', () => {
		for (const id of ['grosbill', 'cybertek']) {
			const { productUrlPattern: pattern, hosts } = shop(id)
			const at = (path: string) => `https://${hosts[0]}${path}`
			expect(pattern.test(at('/pny-rtx-5060-8gb-overclocked-dual-fan-153530')), id).to.equal(true)
			expect(
				pattern.test(at('/pny-rtx-5060-8gb-overclocked-dual-fan-153530#click-collect')),
			).to.equal(true)
			expect(pattern.test(at('/carte-graphique-6')), id).to.equal(false)
			expect(pattern.test(at('/pc-fixe-106/gamer')), id).to.equal(false)
			expect(pattern.test(at('/recherche?q=rtx%204070')), id).to.equal(false)
		}
	})
})

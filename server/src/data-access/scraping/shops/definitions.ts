import type { ListingSelectors } from '../extract/listing'
import type { ProductSelectors } from '../extract/product-page'

/**
 * How the robot reads one shop. Product pages are read by the structured data
 * cascade first (works for every shop exposing schema.org); `product`
 * selectors are only a fallback. Search pages use `listing`, then JSON-LD
 * ItemList, then links matching `productUrlPattern`.
 *
 * ⚠️ Search URLs and card selectors were written from the shops' known layouts
 * without network access to them (cloud dev environment). Check each shop from
 * the server with `npm run probe -- <id> "rtx 4070"` (ticket STK-15) and fix
 * here: the probe prints which strategy found what.
 */
export interface ShopDefinition {
	id: string
	name: string
	country: string
	homepage: string
	/** Exact host names serving the shop (search links outside them are ignored). */
	hosts: string[]
	/** Absent: the shop is only read through pasted links. */
	searchUrl?: (query: string) => string
	productUrlPattern: RegExp
	listing?: ListingSelectors
	product?: ProductSelectors
}

const enc = encodeURIComponent
const plus = (q: string) => enc(q).replace(/%20/g, '+')

export const SHOPS: ShopDefinition[] = [
	{
		id: 'ldlc',
		name: 'LDLC',
		country: 'FR',
		homepage: 'https://www.ldlc.com/',
		hosts: ['www.ldlc.com', 'ldlc.com'],
		searchUrl: (q) => `https://www.ldlc.com/recherche/${enc(q)}/`,
		productUrlPattern: /\/fiche\/PB\d+\.html/i,
		listing: {
			item: 'li.pdt-item',
			link: '.title-3 a, a[href*="/fiche/"]',
			title: '.title-3',
			price: '.price .price, .price',
			stock: '.stock-web, .stock',
			image: 'img',
		},
		product: {
			title: 'h1.title-1',
			price: '.product-info .price .price, .price .price',
			stock: '.stock-web, .content-stock',
		},
	},
	{
		id: 'materielnet',
		name: 'Materiel.net',
		country: 'FR',
		homepage: 'https://www.materiel.net/',
		hosts: ['www.materiel.net', 'materiel.net'],
		searchUrl: (q) => `https://www.materiel.net/recherche/${enc(q)}/`,
		productUrlPattern: /\/produit\/\d+\.html/i,
		listing: {
			item: 'li.ajax-product-item, .c-products-list__item',
			link: 'a.c-product__link, a[href*="/produit/"]',
			title: '.c-product__title',
			price: '.o-product__price, .o-product__prices',
			stock: '.o-availability__value, .c-product__availability',
		},
		product: {
			title: 'h1.c-product__title, h1',
			price: '.o-product__price',
			stock: '.o-availability__value',
		},
	},
	{
		id: 'topachat',
		name: 'Top Achat',
		country: 'FR',
		homepage: 'https://www.topachat.com/',
		hosts: ['www.topachat.com', 'topachat.com'],
		searchUrl: (q) =>
			`https://www.topachat.com/pages/recherche.php?cat=accueil&etou=0&mc=${plus(q)}`,
		productUrlPattern: /\/(pages\/detail2_|produit\/)/i,
		listing: {
			item: 'article.grille-produit, section.produits article, .produits.list article',
			title: '.libelle h2, h2, .libelle',
			price: '.prod_px_euro, .price, .prix',
			stock: '[class*="stock"], .dispo',
		},
	},
	{
		id: 'grosbill',
		name: 'Grosbill',
		country: 'FR',
		homepage: 'https://www.grosbill.com/',
		hosts: ['www.grosbill.com', 'grosbill.com'],
		searchUrl: (q) => `https://www.grosbill.com/catv2.cgi?mode=recherche&recherche=${plus(q)}`,
		productUrlPattern: /-\d+\.aspx(\?|$)/i,
		listing: {
			item: '.grb__liste-produit__liste__produit, .listing_produit, [class*="produit-item"]',
			title: '.grb__liste-produit__liste__produit__information__libelle, h2, .titre',
			price: '[class*="prix"], .price',
			stock: '[class*="dispo"], [class*="stock"]',
		},
	},
	{
		id: 'alternate',
		name: 'Alternate',
		country: 'FR',
		homepage: 'https://www.alternate.fr/',
		hosts: ['www.alternate.fr', 'alternate.fr'],
		searchUrl: (q) => `https://www.alternate.fr/listing.xhtml?q=${plus(q)}`,
		productUrlPattern: /\/html\/product\/\d+/i,
		listing: {
			item: 'a.productBox',
			title: '.product-name',
			price: '.price',
			stock: '.delivery-info',
			image: 'img.productPicture, img',
		},
		product: { title: 'h1', price: '.price', stock: '.delivery-info' },
	},
	{
		id: 'cybertek',
		name: 'Cybertek',
		country: 'FR',
		homepage: 'https://www.cybertek.fr/',
		hosts: ['www.cybertek.fr', 'cybertek.fr'],
		searchUrl: (q) => `https://www.cybertek.fr/boutique/produit.aspx?q=${plus(q)}`,
		productUrlPattern: /-\d+\.aspx(\?|$)/i,
		listing: {
			item: '.listing_produit .produit, .product-item, [class*="ProductCard"]',
			title: '.nom_produit, .product-name, h2',
			price: '.prix_produit, .price',
			stock: '[class*="stock"], [class*="dispo"]',
		},
	},
	{
		id: 'rueducommerce',
		name: 'Rue du Commerce',
		country: 'FR',
		homepage: 'https://www.rueducommerce.fr/',
		hosts: ['www.rueducommerce.fr', 'rueducommerce.fr'],
		searchUrl: (q) => `https://www.rueducommerce.fr/r/${enc(q)}.html`,
		productUrlPattern: /\/p\/[^/?#]+/i,
		listing: {
			item: 'article.item, .listing-item, [data-product-id]',
			title: '.item__title, h2, .title',
			price: '.item__price, .price',
			stock: '[class*="stock"], [class*="availability"]',
		},
	},
	{
		id: 'infomax',
		name: 'Infomax',
		country: 'FR',
		homepage: 'https://www.infomaxparis.com/',
		hosts: ['www.infomaxparis.com', 'infomaxparis.com'],
		searchUrl: (q) => `https://www.infomaxparis.com/fr/recherche?controller=search&s=${plus(q)}`,
		productUrlPattern: /\/\d+-[\w-]+(?:-\d+)?\.html/i,
		// PrestaShop 1.7 theme classes.
		listing: {
			item: 'article.product-miniature',
			link: '.product-title a',
			title: '.product-title',
			price: '.price',
			stock: '.product-availability, .stock, [class*="availability"]',
		},
	},
	{
		id: 'boulanger',
		name: 'Boulanger',
		country: 'FR',
		homepage: 'https://www.boulanger.com/',
		hosts: ['www.boulanger.com', 'boulanger.com'],
		searchUrl: (q) => `https://www.boulanger.com/resultats?tr=${plus(q)}`,
		productUrlPattern: /\/ref\/\d+/i,
		listing: {
			item: '.product-list__item, [class*="product-item"], li.product',
			title: '.product-list__product-label, h2, .designations',
			price: '[class*="price"]',
			stock: '[class*="stock"], [class*="availability"]',
		},
	},
	{
		id: 'darty',
		name: 'Darty',
		country: 'FR',
		homepage: 'https://www.darty.com/',
		hosts: ['www.darty.com', 'darty.com'],
		searchUrl: (q) => `https://www.darty.com/nav/recherche?text=${plus(q)}`,
		productUrlPattern: /\/nav\/achat\/.+\.html/i,
		listing: {
			item: '.product_detail, [class*="product-card"], .prd',
			title: '.prd-name, h2, [class*="product-name"]',
			price: '[class*="price"]',
			stock: '[class*="stock"], [class*="dispo"]',
		},
	},
	{
		id: 'fnac',
		name: 'Fnac',
		country: 'FR',
		homepage: 'https://www.fnac.com/',
		hosts: ['www.fnac.com', 'fnac.com'],
		searchUrl: (q) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${plus(q)}`,
		productUrlPattern: /\/a\d+\//i,
		listing: {
			item: 'article.Article-itemGroup, .Article-item, [class*="article-item"]',
			title: '.Article-title, h2, p.Article-desc',
			price: '.userPrice, .thumbnail-price, [class*="price"]',
			stock: '[class*="availability"], [class*="Dispo"]',
		},
	},
	{
		id: 'cdiscount',
		name: 'Cdiscount',
		country: 'FR',
		homepage: 'https://www.cdiscount.com/',
		hosts: ['www.cdiscount.com', 'cdiscount.com'],
		searchUrl: (q) => `https://www.cdiscount.com/search/10/${enc(q.replace(/\s+/g, '+'))}.html`,
		productUrlPattern: /\/f-\d+-[\w-]+\.html/i,
		listing: {
			item: 'li[data-sku], .lpProduct, [class*="sc-product"]',
			title: '.prdtTit, h2, [class*="title"]',
			price: '.price, .prdtPrice, [class*="price"]',
			stock: '[class*="stock"], [class*="dispo"]',
		},
	},
	{
		id: 'amazon',
		name: 'Amazon',
		country: 'FR',
		homepage: 'https://www.amazon.fr/',
		hosts: ['www.amazon.fr', 'amazon.fr'],
		searchUrl: (q) => `https://www.amazon.fr/s?k=${plus(q)}`,
		productUrlPattern: /\/dp\/[A-Z0-9]{10}/i,
		listing: {
			item: 'div[data-asin][data-component-type="s-search-result"]',
			link: 'h2 a, a.a-link-normal[href*="/dp/"]',
			title: 'h2',
			price: '.a-price .a-offscreen',
			image: 'img.s-image',
		},
		product: {
			title: '#productTitle',
			price: '#corePrice_feature_div .a-offscreen, .a-price .a-offscreen',
			stock: '#availability',
			image: '#landingImage',
		},
	},
	{
		id: 'pccomponentes',
		name: 'PcComponentes',
		country: 'FR',
		homepage: 'https://www.pccomponentes.fr/',
		hosts: ['www.pccomponentes.fr', 'pccomponentes.fr'],
		// Search page rendered in JavaScript: products are read through pasted links only.
		productUrlPattern: /^https:\/\/www\.pccomponentes\.fr\/[\w-]+$/i,
	},
]

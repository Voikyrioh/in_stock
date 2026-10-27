import type { StockState } from '@in-stock/shared'

/**
 * BR-STOCK-002 — maps what shops publish (schema.org availability, OpenGraph
 * values, French or English labels) to the seven states of BR-STOCK-001.
 */

const SCHEMA_ORG: Record<string, StockState> = {
	instock: 'in_stock',
	onlineonly: 'in_stock',
	limitedavailability: 'limited',
	preorder: 'preorder',
	presale: 'preorder',
	backorder: 'backorder',
	madetoorder: 'backorder',
	outofstock: 'out_of_stock',
	soldout: 'out_of_stock',
	instoreonly: 'out_of_stock',
	reserved: 'out_of_stock',
	discontinued: 'discontinued',
}

/** schema.org / OpenGraph availability value ("https://schema.org/InStock", "instock", "oos"…). */
export function stockFromAvailability(value: unknown): StockState {
	if (typeof value !== 'string') return 'unknown'
	const key = value
		.trim()
		.replace(/^https?:\/\/schema\.org\//i, '')
		.toLowerCase()
		.replace(/[\s_-]/g, '')
	if (key === 'oos') return 'out_of_stock'
	if (key === 'pending' || key === 'availablefororder') return 'backorder'
	return SCHEMA_ORG[key] ?? stockFromText(value)
}

// Order matters: negative wordings first ("indisponible" contains "disponible").
const TEXT_RULES: [RegExp, StockState][] = [
	[
		/\b(produit arrete|n'?est plus (commercialise|fabrique|vendu)|fin de vie|discontinued)\b/,
		'discontinued',
	],
	[
		/\b(rupture|epuise|indisponible|non disponible|plus disponible|hors stock|out of stock|sold out|temporairement indisponible|victime de son succes)\b/,
		'out_of_stock',
	],
	[/\b(pre-?commande|pre-?commander|pre-?order|precommande)\b/, 'preorder'],
	[
		/\b(reappro\w*|en cours d'approvisionnement|disponible sous|expedie sous \d+ ?(jours?|semaines?|j)|sur commande|en commande|back-?order|en stock fournisseur|delai fournisseur)\b/,
		'backorder',
	],
	[
		/\b(stock limite|derniers? (articles?|exemplaires?|pieces?)|plus que \d+|quantite limitee|low stock|only \d+ left)\b/,
		'limited',
	],
	[
		/\b(en stock|in stock|disponible|expedie (aujourd'hui|sous 24 ?h|demain)|livre demain|available)\b/,
		'in_stock',
	],
]

/** Stock state from a free text label shown on a page ("En stock", "Rupture de stock"…). */
export function stockFromText(text: unknown): StockState {
	if (typeof text !== 'string') return 'unknown'
	const normalised = text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[’]/g, "'")
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim()
	if (!normalised) return 'unknown'
	for (const [pattern, state] of TEXT_RULES) if (pattern.test(normalised)) return state
	return 'unknown'
}

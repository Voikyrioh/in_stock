import type { SearchShopStatus, ShopState, StockState } from '@in-stock/shared'

/**
 * Every user-facing wording, as validated in the functional specs
 * (contexts/in-stock/conceptions/2026-10-27-fonctionnelle-*.md). No em dash in
 * product copy (ADR-0013).
 */

export const STOCK_LABELS: Record<StockState, string> = {
	in_stock: 'En stock',
	limited: 'Stock limité',
	preorder: 'Précommande',
	backorder: 'Réapprovisionnement',
	out_of_stock: 'Rupture',
	discontinued: 'Arrêté',
	unknown: 'Inconnu',
}

export const SHOP_STATE_LABELS: Record<ShopState, string> = {
	operational: 'Opérationnelle',
	degraded: 'Perturbée',
	down: 'Indisponible',
	forbidden: 'Lecture interdite par la boutique',
	unknown: 'Pas encore interrogée',
}

export function searchStatusLabel(status: SearchShopStatus, offerCount: number): string {
	switch (status) {
		case 'pending':
			return 'en cours…'
		case 'done':
		case 'cached':
			return offerCount === 0 ? 'aucune offre' : `${offerCount} offre${offerCount > 1 ? 's' : ''}`
		case 'timeout':
			return 'trop lente, ignorée'
		case 'forbidden':
			return 'lecture interdite par la boutique'
		case 'blocked':
		case 'failed':
			return 'indisponible pour le moment'
	}
}

export const MESSAGES = {
	queryTooShort: 'Saisissez au moins 2 caractères.',
	queryTooLong: '100 caractères au maximum.',
	tooManySearches: "Trop de recherches d'affilée. Réessayez dans une minute.",
	serviceDown: 'Le service ne répond pas. Réessayez dans un instant.',
	noOffer: (q: string) =>
		`Aucune offre trouvée pour « ${q} ». Essayez un autre nom ou collez le lien d'un produit.`,
	urlFormat: 'Collez un lien complet qui commence par https://.',
	urlForbidden: 'Ce lien ne peut pas être lu.',
	noProduct:
		"Nous n'avons pas trouvé de produit sur cette page. Collez le lien de la fiche du produit.",
	unreachable: "Le site n'a pas répondu. Réessayez dans quelques minutes.",
	robots: "Cette boutique n'autorise pas la lecture automatique de cette page.",
	blocked: 'Cette boutique bloque notre robot pour le moment.',
	tooManyAdds: "Trop d'ajouts d'affilée. Réessayez dans une minute.",
	refreshTooSoon: "Les prix viennent d'être relevés. Réessayez dans 2 minutes.",
	staleOffer: 'Relevé impossible, dernier état connu',
	productNotFound: 'Produit introuvable',
	noOfferInStock: "Aucune boutique ne l'a en stock pour le moment.",
	emailRequired: 'Saisissez votre email.',
	emailInvalid: 'Saisissez un email valide.',
	passwordShort: 'Le mot de passe doit faire au moins 10 caractères.',
	passwordLong: '128 caractères au maximum.',
	passwordRequired: 'Saisissez votre mot de passe.',
	emailTaken: 'Un compte existe déjà avec cet email. Connectez-vous.',
	badCredentials: 'Email ou mot de passe incorrect.',
	tooManyAttempts: 'Trop de tentatives. Réessayez dans 15 minutes.',
	sessionExpired: 'Votre session a expiré. Connectez-vous à nouveau.',
	badPassword: 'Mot de passe incorrect.',
	accountDeleted: 'Votre compte a été supprimé.',
	loggedOut: 'Vous êtes déconnecté.',
	followed: 'Produit suivi. Ses prix sont relevés toutes les 30 minutes.',
	unfollowed: (name: string) => `${name} n'est plus suivi.`,
	followLimit: 'Vous suivez déjà 100 produits. Retirez-en un pour en suivre un nouveau.',
	noFollow: 'Vous ne suivez encore aucun produit. Cherchez un produit et cliquez sur Suivre.',
	loginToFollow: 'Connectez-vous pour suivre ce produit.',
	shopsUnavailable: "Impossible de charger l'état des boutiques.",
} as const

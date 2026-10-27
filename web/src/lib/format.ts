/** Price split for display: "1 299" + ",95 €" (cents in superscript, design system). */
export function priceParts(cents: number, currency = 'EUR'): { units: string; decimals: string } {
	const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(
		cents / 100,
	)
	const match = /^(.*?)([,.]\d{2})(\s*\D*)$/.exec(formatted.replace(/ /g, ' '))
	if (!match) return { units: formatted, decimals: '' }
	return { units: match[1] ?? formatted, decimals: `${match[2] ?? ''}${match[3] ?? ''}` }
}

export function formatPrice(cents: number, currency = 'EUR'): string {
	return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
}

/** « il y a 4 min », « il y a 2 h », « il y a 3 jours ». */
export function relativeTime(iso: string | null, now: Date = new Date()): string {
	if (!iso) return 'jamais'
	const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000))
	if (seconds < 45) return "à l'instant"
	const minutes = Math.round(seconds / 60)
	if (minutes < 60) return `il y a ${minutes} min`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `il y a ${hours} h`
	const days = Math.round(hours / 24)
	return `il y a ${days} jour${days > 1 ? 's' : ''}`
}

/** « 14:02 ». */
export function clockTime(iso: string | null): string {
	if (!iso) return ''
	return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
		new Date(iso),
	)
}

/** « 27 octobre 2026 ». */
export function longDate(iso: string): string {
	return new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(new Date(iso))
}

export function plural(n: number, one: string, many: string): string {
	return `${n} ${n > 1 ? many : one}`
}

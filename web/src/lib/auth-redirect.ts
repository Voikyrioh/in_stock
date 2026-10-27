import type { LocationQuery, Router } from 'vue-router'
import { errorMessage } from '../api/http'
import { useFollows } from '../stores/follows'
import { useToasts } from '../stores/toasts'
import { MESSAGES } from './copy'

/** Only paths of this site: never an open redirect to another origin. */
export function safeRedirect(value: unknown): string | null {
	return typeof value === 'string' &&
		value.startsWith('/') &&
		!value.startsWith('//') &&
		!value.startsWith('/\\')
		? value
		: null
}

/** After login or sign up: follow the product that triggered it, then go back where we were. */
export async function afterSignIn(router: Router, query: LocationQuery) {
	const follow = typeof query.follow === 'string' ? query.follow : null
	if (follow) {
		const toasts = useToasts()
		try {
			await useFollows().follow(follow)
			toasts.show(MESSAGES.followed, 'success')
		} catch (error) {
			toasts.show(errorMessage(error), 'error')
		}
	}
	await router.replace(safeRedirect(query.redirect) ?? { name: 'follows' })
}

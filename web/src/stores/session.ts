import type { UserView } from '@in-stock/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { endpoints } from '../api/endpoints'
import { ApiError } from '../api/http'

/** The signed-in account. The session itself is an HttpOnly cookie the page never sees. */
export const useSession = defineStore('session', () => {
	const user = ref<UserView | null>(null)
	const loaded = ref(false)
	let loading: Promise<void> | null = null

	const signedIn = computed(() => user.value !== null)

	function load(): Promise<void> {
		loading ??= endpoints
			.me()
			.then((r) => {
				user.value = r.user
			})
			.catch((error: unknown) => {
				if (!(error instanceof ApiError) || error.status !== 401) throw error
				user.value = null
			})
			.finally(() => {
				loaded.value = true
				loading = null
			})
		return loading
	}

	async function register(email: string, password: string) {
		user.value = (await endpoints.register(email, password)).user
	}

	async function login(email: string, password: string) {
		user.value = (await endpoints.login(email, password)).user
	}

	async function logout() {
		await endpoints.logout()
		user.value = null
	}

	async function deleteAccount(password: string) {
		await endpoints.deleteAccount(password)
		user.value = null
	}

	/** The API answered 401: the session expired or the account was deleted elsewhere. */
	function forget() {
		user.value = null
	}

	return { user, loaded, signedIn, load, register, login, logout, deleteAccount, forget }
})

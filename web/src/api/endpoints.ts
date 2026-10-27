import type { FollowView, ProductResponse, SearchView, ShopView, UserView } from '@in-stock/shared'
import { api } from './http'

export const endpoints = {
	startSearch: (query: string) => api<{ search: SearchView }>('POST', '/searches', { query }),
	getSearch: (id: string) => api<{ search: SearchView }>('GET', `/searches/${id}`),
	addFromUrl: (url: string) =>
		api<{ productId: string; created: boolean }>('POST', '/products/from-url', { url }),
	getProduct: (id: string) => api<ProductResponse>('GET', `/products/${id}`),
	refreshProduct: (id: string) => api<ProductResponse>('POST', `/products/${id}/refresh`),
	shops: () => api<{ shops: ShopView[] }>('GET', '/shops'),
	me: () => api<{ user: UserView }>('GET', '/auth/me'),
	register: (email: string, password: string) =>
		api<{ user: UserView }>('POST', '/auth/register', { email, password }),
	login: (email: string, password: string) =>
		api<{ user: UserView }>('POST', '/auth/login', { email, password }),
	logout: () => api<void>('POST', '/auth/logout'),
	deleteAccount: (password: string) => api<void>('DELETE', '/account', { password }),
	follows: () => api<{ follows: FollowView[] }>('GET', '/follows'),
	follow: (productId: string) => api<void>('PUT', `/follows/${productId}`),
	unfollow: (productId: string) => api<void>('DELETE', `/follows/${productId}`),
}

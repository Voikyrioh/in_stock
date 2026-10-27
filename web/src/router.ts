import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import { useSession } from './stores/session'

const routes: RouteRecordRaw[] = [
	{ path: '/', name: 'home', component: HomePage },
	{ path: '/recherche', name: 'search', component: () => import('./pages/SearchPage.vue') },
	{ path: '/ajouter', name: 'add', component: () => import('./pages/AddPage.vue') },
	{ path: '/produit/:id', name: 'product', component: () => import('./pages/ProductPage.vue') },
	{
		path: '/suivis',
		name: 'follows',
		component: () => import('./pages/FollowsPage.vue'),
		meta: { requiresAuth: true },
	},
	{
		path: '/connexion',
		name: 'login',
		component: () => import('./pages/LoginPage.vue'),
		meta: { guestOnly: true },
	},
	{
		path: '/inscription',
		name: 'register',
		component: () => import('./pages/RegisterPage.vue'),
		meta: { guestOnly: true },
	},
	{
		path: '/compte',
		name: 'account',
		component: () => import('./pages/AccountPage.vue'),
		meta: { requiresAuth: true },
	},
	{ path: '/boutiques', name: 'shops', component: () => import('./pages/ShopsPage.vue') },
	{ path: '/robot', name: 'robot', component: () => import('./pages/RobotPage.vue') },
	{
		path: '/:pathMatch(.*)*',
		name: 'not-found',
		component: () => import('./pages/NotFoundPage.vue'),
	},
]

export function createAppRouter() {
	const router = createRouter({
		history: createWebHistory(),
		routes,
		scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash } : { top: 0 }),
	})

	router.beforeEach(async (to) => {
		const session = useSession()
		if (!session.loaded) await session.load().catch(() => undefined)
		if (to.meta.requiresAuth && !session.signedIn)
			return { name: 'login', query: { redirect: to.fullPath } }
		if (to.meta.guestOnly && session.signedIn) return { name: 'follows' }
		return true
	})

	return router
}

declare module 'vue-router' {
	interface RouteMeta {
		requiresAuth?: boolean
		guestOnly?: boolean
	}
}

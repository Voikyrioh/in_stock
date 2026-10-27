import { LIMITS } from '@in-stock/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import type { UseCases } from '../../container'
import { betterZodValidator } from '../../libraries/validator'
import { rateLimit } from '../middlewares/rate-limit'
import {
	type AppEnv,
	type CookieSettings,
	clearSessionCookie,
	currentUser,
	requireUser,
	writeSessionCookie,
} from '../middlewares/session'

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)
const idParam = z.object({ id: ulid })
const productParam = z.object({ productId: ulid })
const credentials = z.object({
	email: z.string().max(LIMITS.emailMax),
	password: z.string().min(1).max(LIMITS.passwordMax),
})

/**
 * Routes: Zod at the boundary, one use case call, the JSON answer. No logic
 * here (ADR-0002); errors go through handleHttpErrors.
 */
export function apiRoutes(uc: UseCases, cookie: CookieSettings) {
	const api = new Hono<AppEnv>()
	const searchLimit = rateLimit({ windowMs: 60_000, max: 20, reason: 'search' }) // BR-SEARCH-007
	const addLimit = rateLimit({ windowMs: 60_000, max: 10, reason: 'add' }) // BR-ADD-001
	const refreshLimit = rateLimit({ windowMs: 60_000, max: 10, reason: 'refresh' })
	const authLimit = rateLimit({ windowMs: 15 * 60_000, max: 10, reason: 'auth' }) // BR-ACCOUNT-004

	api.get('/health', (c) => c.json({ status: 'ok' }))

	api.get('/shops', async (c) => c.json({ shops: await uc.listShops.Execute() }))

	api.post(
		'/searches',
		searchLimit,
		betterZodValidator('json', z.object({ query: z.string().max(500) })),
		async (c) => c.json({ search: await uc.startSearch.Execute(c.req.valid('json').query) }, 202),
	)
	api.get('/searches/:id', betterZodValidator('param', idParam), async (c) =>
		c.json({ search: await uc.getSearch.Execute(c.req.valid('param').id) }),
	)

	api.post(
		'/products/from-url',
		addLimit,
		betterZodValidator('json', z.object({ url: z.string().max(LIMITS.urlMax) })),
		async (c) => c.json(await uc.addFromUrl.Execute(c.req.valid('json').url)),
	)
	api.get('/products/:id', betterZodValidator('param', idParam), async (c) =>
		c.json(await uc.getProduct.Execute(c.req.valid('param').id, c.get('user')?.id ?? null)),
	)
	api.post('/products/:id/refresh', refreshLimit, betterZodValidator('param', idParam), async (c) =>
		c.json(await uc.refreshProduct.Execute(c.req.valid('param').id, c.get('user')?.id ?? null)),
	)

	api.post('/auth/register', authLimit, betterZodValidator('json', credentials), async (c) => {
		const { user, token, expiresAt } = await uc.register.Execute(c.req.valid('json'))
		writeSessionCookie(c, cookie, token, expiresAt)
		return c.json({ user }, 201)
	})
	api.post('/auth/login', authLimit, betterZodValidator('json', credentials), async (c) => {
		const { user, token, expiresAt } = await uc.login.Execute(c.req.valid('json'))
		writeSessionCookie(c, cookie, token, expiresAt)
		return c.json({ user })
	})
	api.post('/auth/logout', async (c) => {
		const token = c.get('sessionToken')
		if (token) await uc.sessions.close(token)
		clearSessionCookie(c, cookie)
		return c.body(null, 204)
	})
	api.get('/auth/me', requireUser, (c) => {
		const user = currentUser(c)
		return c.json({
			user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
		})
	})

	api.delete(
		'/account',
		authLimit,
		requireUser,
		betterZodValidator('json', z.object({ password: z.string().min(1).max(LIMITS.passwordMax) })),
		async (c) => {
			await uc.deleteAccount.Execute(currentUser(c), c.req.valid('json').password)
			clearSessionCookie(c, cookie)
			return c.body(null, 204)
		},
	)

	api.get('/follows', requireUser, async (c) =>
		c.json({ follows: await uc.listFollows.Execute(currentUser(c).id) }),
	)
	api.put(
		'/follows/:productId',
		requireUser,
		betterZodValidator('param', productParam),
		async (c) => {
			await uc.follow.Execute(currentUser(c).id, c.req.valid('param').productId)
			return c.body(null, 204)
		},
	)
	api.delete(
		'/follows/:productId',
		requireUser,
		betterZodValidator('param', productParam),
		async (c) => {
			await uc.unfollow.Execute(currentUser(c).id, c.req.valid('param').productId)
			return c.body(null, 204)
		},
	)

	return api
}

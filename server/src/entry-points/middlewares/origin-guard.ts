import type { MiddlewareHandler } from 'hono'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF defence in depth (the session cookie is already SameSite=Lax): a
 * state-changing request must come from our own pages. Browsers always send
 * Origin on such requests; `publicOrigin` null (development, tests) disables it.
 */
export function originGuard(publicOrigin: string | null): MiddlewareHandler {
	return async (c, next) => {
		if (publicOrigin && !SAFE.has(c.req.method)) {
			const origin = c.req.header('origin')
			const site = c.req.header('sec-fetch-site')
			const sameOrigin = origin ? origin === publicOrigin : site === 'same-origin'
			if (!sameOrigin)
				return c.json(
					{ code: 'forbidden', message: 'Cross-site request refused', reason: 'origin' },
					403,
				)
		}
		await next()
	}
}

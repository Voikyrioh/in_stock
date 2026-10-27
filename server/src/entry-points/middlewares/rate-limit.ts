import type { Context, MiddlewareHandler } from 'hono'

/**
 * Fixed-window limiter in memory (mono-instance). The address is only a map
 * key, it is never logged nor stored. Behind Cloudflare, cf-connecting-ip is
 * the visitor.
 */
export function rateLimit(options: {
	windowMs: number
	max: number
	reason: string
	now?: () => number
}) {
	const hits = new Map<string, { count: number; resetAt: number }>()
	const now = options.now ?? Date.now
	let lastCleanup = now()

	const middleware: MiddlewareHandler = async (c, next) => {
		const time = now()
		if (time - lastCleanup > options.windowMs) {
			for (const [key, hit] of hits) if (hit.resetAt <= time) hits.delete(key)
			lastCleanup = time
		}
		const key = clientKey(c)
		const hit = hits.get(key)
		if (!hit || hit.resetAt <= time) {
			hits.set(key, { count: 1, resetAt: time + options.windowMs })
		} else if (++hit.count > options.max) {
			const retryAfter = Math.ceil((hit.resetAt - time) / 1000)
			c.header('Retry-After', String(retryAfter))
			return c.json(
				{
					code: 'rate-limited',
					message: 'Too many requests',
					reason: options.reason,
					details: { retryAfterSeconds: retryAfter },
				},
				429,
			)
		}
		await next()
	}
	return middleware
}

export function clientKey(c: Context): string {
	return (
		c.req.header('cf-connecting-ip') ??
		c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
		'local'
	)
}

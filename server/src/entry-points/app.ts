import { handleHttpErrors, otelHono } from '@Voikyrioh/observability'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { UseCases } from '../container'
import { originGuard } from './middlewares/origin-guard'
import { type AppEnv, cookieSettings, sessionMiddleware } from './middlewares/session'
import { apiRoutes } from './routes/api.routes'

export interface AppOptions {
	/** Allowed Origin of mutations and CSP source; null = development/tests. */
	publicOrigin: string | null
	/** Built web client to serve, null = API only (Vite serves it in development). */
	staticDir: string | null
	production: boolean
}

const CSP = [
	"default-src 'self'",
	// Product pictures are hot-linked from the shops (sent without referrer).
	"img-src 'self' https: data:",
	"style-src 'self'",
	"font-src 'self'",
	"connect-src 'self'",
	"object-src 'none'",
	"base-uri 'none'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join('; ')

/** One origin serves the client and the API (/api): no CORS, one container. */
export function createApp(uc: UseCases, options: AppOptions) {
	const app = new Hono<AppEnv>()
	const cookie = cookieSettings(options.production)

	// First middleware: one server span per request (SigNoz), logs carry its traceId.
	app.use(otelHono())
	app.onError(handleHttpErrors)
	app.notFound((c) =>
		c.req.path.startsWith('/api/')
			? c.json({ code: 'not-found', message: 'Route not found', reason: 'route' }, 404)
			: c.text('Page introuvable', 404),
	)

	app.use('/api/*', async (c, next) => {
		await next()
		c.header('Cache-Control', 'no-store')
		c.header('X-Content-Type-Options', 'nosniff')
	})
	app.use(
		'/api/*',
		bodyLimit({
			maxSize: 16 * 1024,
			onError: (c) =>
				c.json({ code: 'invalid-payload', message: 'Body too large', reason: 'too-large' }, 413),
		}),
	)
	app.use('/api/*', originGuard(options.publicOrigin))
	app.use('/api/*', sessionMiddleware(uc.sessions, cookie))
	app.route('/api', apiRoutes(uc, cookie))

	if (options.staticDir) {
		const root = options.staticDir
		app.use('*', async (c, next) => {
			await next()
			if (c.req.path.startsWith('/api/')) return
			c.header('Content-Security-Policy', CSP)
			c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
			c.header('X-Content-Type-Options', 'nosniff')
			c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
			c.header(
				'Cache-Control',
				c.req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
			)
		})
		app.get('*', serveStatic({ root }))
		// Client side routes (/produit/…, /suivis…) all load the single page.
		app.get('*', (c, next) =>
			c.req.path.startsWith('/api/') ? next() : serveStatic({ root, path: 'index.html' })(c, next),
		)
	}
	return app
}

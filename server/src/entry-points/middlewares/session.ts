import { FunctionalError } from '@Voikyrioh/observability'
import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { User } from '../../domain/entities/user'
import type { SessionService } from '../../domain/usecases/account/session-service'

export type AppEnv = { Variables: { user: User | null; sessionToken: string | null } }

export interface CookieSettings {
	name: string
	secure: boolean
}

/** Production: `__Host-` prefix (Secure, Path=/, no Domain): the cookie cannot be planted by a subdomain. */
export function cookieSettings(production: boolean): CookieSettings {
	return production
		? { name: '__Host-instock_session', secure: true }
		: { name: 'instock_session', secure: false }
}

export function writeSessionCookie(
	c: Context,
	settings: CookieSettings,
	token: string,
	expiresAt: Date,
) {
	setCookie(c, settings.name, token, {
		httpOnly: true,
		secure: settings.secure,
		sameSite: 'Lax',
		path: '/',
		expires: expiresAt,
	})
}

export function clearSessionCookie(c: Context, settings: CookieSettings) {
	deleteCookie(c, settings.name, { path: '/', secure: settings.secure })
}

/** Resolves the visitor's account from the session cookie (null when anonymous). */
export function sessionMiddleware(
	sessions: SessionService,
	settings: CookieSettings,
): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		c.set('user', null)
		c.set('sessionToken', null)
		const token = getCookie(c, settings.name)
		if (token && token.length <= 128) {
			const found = await sessions.authenticate(token)
			if (found) {
				c.set('user', found.user)
				c.set('sessionToken', token)
				writeSessionCookie(c, settings, token, found.expiresAt)
			} else clearSessionCookie(c, settings)
		}
		await next()
	}
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (!c.get('user'))
		throw new FunctionalError('unauthorized', 'Login required', undefined, 'no-session')
	await next()
}

export function currentUser(c: Context<AppEnv>): User {
	const user = c.get('user')
	if (!user) throw new FunctionalError('unauthorized', 'Login required', undefined, 'no-session')
	return user
}

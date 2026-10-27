import type { ApiErrorBody } from '@in-stock/shared'
import { MESSAGES } from '../lib/copy'

/** An answer of the API that is not a success, with its stable code + reason. */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		readonly reason: string | null,
		readonly details: ApiErrorBody['details'] | Record<string, unknown> | null,
	) {
		super(`${status} ${code}${reason ? `/${reason}` : ''}`)
		this.name = 'ApiError'
	}
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
	let res: Response
	try {
		res = await fetch(`/api${path}`, {
			method,
			credentials: 'same-origin',
			headers: body !== undefined ? { 'content-type': 'application/json' } : {},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		})
	} catch {
		throw new ApiError(0, 'network', null, null)
	}
	if (res.status === 204) return undefined as T
	const text = await res.text()
	let json: unknown = null
	try {
		json = text ? JSON.parse(text) : null
	} catch {
		json = null
	}
	if (!res.ok) {
		const err = (json ?? {}) as Partial<ApiErrorBody>
		throw new ApiError(
			res.status,
			err.code ?? 'internal',
			err.reason ?? null,
			(err.details as ApiError['details']) ?? null,
		)
	}
	return json as T
}

/** The wording shown for an error, by code + reason (never by the server message). */
export function errorMessage(error: unknown, fallback: string = MESSAGES.serviceDown): string {
	if (!(error instanceof ApiError)) return fallback
	const byReason: Record<string, string> = {
		'query-length': MESSAGES.queryTooShort,
		search: MESSAGES.tooManySearches,
		'url-format': MESSAGES.urlFormat,
		'url-forbidden': MESSAGES.urlForbidden,
		'no-product': MESSAGES.noProduct,
		unreachable: MESSAGES.unreachable,
		robots: MESSAGES.robots,
		blocked: MESSAGES.blocked,
		add: MESSAGES.tooManyAdds,
		'refresh-too-soon': MESSAGES.refreshTooSoon,
		refresh: MESSAGES.refreshTooSoon,
		'email-taken': MESSAGES.emailTaken,
		'bad-credentials': MESSAGES.badCredentials,
		auth: MESSAGES.tooManyAttempts,
		'bad-password': MESSAGES.badPassword,
		'follow-limit': MESSAGES.followLimit,
		'no-session': MESSAGES.sessionExpired,
		product: MESSAGES.productNotFound,
	}
	return (error.reason && byReason[error.reason]) || fallback
}

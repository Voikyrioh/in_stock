import { LIMITS } from '@in-stock/shared'

/** BR-ACCOUNT-001 — an email identifies one account regardless of case and surrounding spaces. */
export function normaliseEmail(raw: string): string {
	return raw.trim().toLowerCase()
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
	return email.length <= LIMITS.emailMax && EMAIL.test(email)
}

/** BR-ACCOUNT-002 — 10 to 128 characters. */
export function isValidPassword(password: string): boolean {
	return password.length >= LIMITS.passwordMin && password.length <= LIMITS.passwordMax
}

/** BR-ACCOUNT-005 — a session lives 30 days after its last use. */
export const SESSION_TTL_MS = 30 * 24 * 3600_000

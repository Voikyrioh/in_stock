import type { Session, User } from '../../entities/user'
import type { SessionRepository, UserRepository } from '../../ports/repositories'
import type { Clock, TokenService } from '../../ports/system'
import { SESSION_TTL_MS } from '../../rules/account'

const EXTEND_AFTER_MS = 24 * 3600_000

/** BR-ACCOUNT-005 — opaque sessions, 30 days after the last use. */
export class SessionService {
	constructor(
		private readonly deps: {
			sessions: SessionRepository
			users: UserRepository
			tokens: TokenService
			clock: Clock
		},
	) {}

	async open(userId: string): Promise<{ token: string; expiresAt: Date }> {
		const now = this.deps.clock.now()
		const token = this.deps.tokens.generate()
		const session: Session = {
			tokenHash: this.deps.tokens.digest(token),
			userId,
			createdAt: now,
			expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
		}
		await this.deps.sessions.create(session)
		return { token, expiresAt: session.expiresAt }
	}

	/** The user of a valid session token; slides its expiry (at most one write per day). */
	async authenticate(token: string): Promise<{ user: User; expiresAt: Date } | null> {
		const tokenHash = this.deps.tokens.digest(token)
		const session = await this.deps.sessions.find(tokenHash)
		if (!session) return null
		const now = this.deps.clock.now()
		if (session.expiresAt <= now) {
			await this.deps.sessions.delete(tokenHash)
			return null
		}
		const user = await this.deps.users.findById(session.userId)
		if (!user) return null
		let expiresAt = session.expiresAt
		if (session.expiresAt.getTime() - now.getTime() < SESSION_TTL_MS - EXTEND_AFTER_MS) {
			expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
			await this.deps.sessions.extend(tokenHash, expiresAt)
		}
		return { user, expiresAt }
	}

	async close(token: string): Promise<void> {
		await this.deps.sessions.delete(this.deps.tokens.digest(token))
	}
}

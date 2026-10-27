import { FunctionalError, UseCase } from '@Voikyrioh/observability'
import type { UserView } from '@in-stock/shared'
import { User } from '../../entities/user'
import type { UserRepository } from '../../ports/repositories'
import type { Clock, IdGenerator, PasswordHasher } from '../../ports/system'
import { isValidEmail, isValidPassword, normaliseEmail } from '../../rules/account'
import type { SessionService } from './session-service'

export interface AccountDeps {
	users: UserRepository
	hasher: PasswordHasher
	sessions: SessionService
	clock: Clock
	ids: IdGenerator
}

export interface Credentials {
	email: string
	password: string
}

export interface OpenedSession {
	user: UserView
	token: string
	expiresAt: Date
}

export function toUserView(user: User): UserView {
	return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() }
}

export class RegisterUseCase extends UseCase {
	constructor(private readonly deps: AccountDeps) {
		super()
	}

	async Execute({ email: rawEmail, password }: Credentials): Promise<OpenedSession> {
		const email = normaliseEmail(rawEmail)
		if (!isValidEmail(email)) {
			throw new FunctionalError('invalid-payload', 'Invalid email', [
				{ field: 'email', code: 'invalid', message: 'Invalid email' },
			])
		}
		if (!isValidPassword(password)) {
			throw new FunctionalError('invalid-payload', 'Invalid password', [
				{ field: 'password', code: 'length', message: 'Password must be 10 to 128 characters' },
			])
		}
		const passwordHash = await this.runStep('Hash password', () => this.deps.hasher.hash(password))
		const user = User.restore({
			id: this.deps.ids.next(),
			email,
			passwordHash,
			createdAt: this.deps.clock.now(),
		})
		// BR-ACCOUNT-001
		if (!(await this.deps.users.create(user))) {
			throw new FunctionalError(
				'conflict',
				'An account already uses this email',
				undefined,
				'email-taken',
			)
		}
		const session = await this.deps.sessions.open(user.id)
		return { user: toUserView(user), ...session }
	}
}

/**
 * BR-ACCOUNT-003 — one answer for unknown email and wrong password, and the
 * same hashing cost in both cases (no account enumeration by timing).
 */
export class LoginUseCase extends UseCase {
	private dummyHash: Promise<string> | null = null

	constructor(private readonly deps: AccountDeps) {
		super()
		// Computed once at boot, so that even the first unknown email costs one verification only.
		void this.dummy().catch(() => {
			this.dummyHash = null
		})
	}

	async Execute({ email: rawEmail, password }: Credentials): Promise<OpenedSession> {
		const user = await this.deps.users.findByEmail(normaliseEmail(rawEmail))
		const hash = user?.passwordHash ?? (await this.dummy())
		const valid = await this.runStep('Verify password', () =>
			this.deps.hasher.verify(hash, password),
		)
		if (!user || !valid) {
			throw new FunctionalError(
				'unauthorized',
				'Wrong email or password',
				undefined,
				'bad-credentials',
			)
		}
		const session = await this.deps.sessions.open(user.id)
		return { user: toUserView(user), ...session }
	}

	private dummy(): Promise<string> {
		this.dummyHash ??= this.deps.hasher.hash(`dummy-${this.deps.ids.next()}`)
		return this.dummyHash
	}
}

/** BR-ACCOUNT-006 — confirmed by the password; follows and sessions go with the account. */
export class DeleteAccountUseCase extends UseCase {
	constructor(private readonly deps: AccountDeps) {
		super()
	}

	async Execute(user: User, password: string): Promise<void> {
		const valid = await this.runStep('Verify password', () =>
			this.deps.hasher.verify(user.passwordHash, password),
		)
		if (!valid)
			throw new FunctionalError('unauthorized', 'Wrong password', undefined, 'bad-password')
		await this.deps.users.delete(user.id)
	}
}

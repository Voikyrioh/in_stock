import { z } from 'zod'

const schema = z.object({
	id: z.string().min(1),
	email: z.email().max(254),
	passwordHash: z.string().min(20),
	createdAt: z.date(),
})

export type UserProps = z.infer<typeof schema>

export class User {
	private constructor(private readonly props: UserProps) {}

	static restore(props: UserProps): User {
		return new User(schema.parse(props))
	}

	get id() {
		return this.props.id
	}
	get email() {
		return this.props.email
	}
	get passwordHash() {
		return this.props.passwordHash
	}
	get createdAt() {
		return this.props.createdAt
	}
}

export interface Session {
	tokenHash: string
	userId: string
	createdAt: Date
	expiresAt: Date
}

export interface Clock {
	now(): Date
}

export interface IdGenerator {
	/** Sortable unique id (ULID). */
	next(): string
}

export interface PasswordHasher {
	hash(password: string): Promise<string>
	verify(hash: string, password: string): Promise<boolean>
}

export interface TokenService {
	/** New opaque session token for the cookie (never stored). */
	generate(): string
	/** What is stored: the token digest. */
	digest(token: string): string
}

import { createHash, randomBytes } from 'node:crypto'
import type { TokenService } from '../../domain/ports/system'

/** 256-bit random token (base64url, ADR-0008); only its SHA-256 is stored. */
export const sha256TokenService: TokenService = {
	generate: () => randomBytes(32).toString('base64url'),
	digest: (token) => createHash('sha256').update(token).digest('hex'),
}

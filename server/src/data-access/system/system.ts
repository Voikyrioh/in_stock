import { ulid } from 'ulid'
import type { Clock, IdGenerator } from '../../domain/ports/system'

export const systemClock: Clock = { now: () => new Date() }

export const ulidGenerator: IdGenerator = { next: () => ulid() }

import { Logger } from '@Voikyrioh/observability'
import pg from 'pg'

export function createPool(url: string, max: number): pg.Pool {
	const pool = new pg.Pool({ connectionString: url, max })
	pool.on('error', (error) => Logger.error({ err: error }, 'Postgres pool error'))
	return pool
}

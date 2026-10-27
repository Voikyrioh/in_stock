import { z } from 'zod'

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1')

/**
 * Environment variables, validated once at boot: a bad value stops the process
 * immediately instead of failing at the first request. Production values come
 * from the infra app sheet (apps/in-stock.yml) and Vault (DATABASE_URL).
 */
const schema = z
	.object({
		NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
		HOSTNAME: z.string().min(1).default('127.0.0.1'),
		PORT: z.coerce.number().int().min(1).max(65535).default(3000),
		STORAGE: z.enum(['postgres', 'memory']).default('postgres'),
		DATABASE_URL: z.string().min(1).optional(),
		PG_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
		// https://in-stock.voikyrioh.fr: mutations from another origin are refused, CSP.
		PUBLIC_ORIGIN: z.url().optional(),
		STATIC_DIR: z.string().default(''),
		MIGRATIONS_DIR: z.string().default('migrations'),
		LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
		// Robot (BR-SCRAPE-001/002, BR-SHOP-003)
		SCRAPER_CONTACT_URL: z.url().optional(),
		SCRAPER_MIN_DELAY_MS: z.coerce.number().int().min(1000).max(60_000).default(2000),
		SCRAPER_MAX_CONCURRENT: z.coerce.number().int().min(1).max(32).default(8),
		RESPECT_ROBOTS: bool.default(true),
		DISABLED_SHOPS: z.string().default(''),
		SCHEDULER_ENABLED: bool.default(true),
	})
	.superRefine((env, ctx) => {
		if (env.STORAGE === 'postgres' && !env.DATABASE_URL) {
			ctx.addIssue({
				code: 'custom',
				path: ['DATABASE_URL'],
				message: 'Required with STORAGE=postgres',
			})
		}
		if (env.NODE_ENV === 'production') {
			if (!env.PUBLIC_ORIGIN)
				ctx.addIssue({ code: 'custom', path: ['PUBLIC_ORIGIN'], message: 'Required in production' })
			if (!env.RESPECT_ROBOTS)
				ctx.addIssue({
					code: 'custom',
					path: ['RESPECT_ROBOTS'],
					message: 'Always true in production',
				})
		}
	})

export type Config = {
	env: 'development' | 'production' | 'test'
	host: string
	port: number
	storage: { kind: 'postgres'; url: string; poolMax: number } | { kind: 'memory' }
	publicOrigin: string | null
	staticDir: string | null
	migrationsDir: string
	logLevel: 'debug' | 'info' | 'warn' | 'error'
	robot: {
		userAgent: string
		agentToken: string
		minDelayMs: number
		maxConcurrent: number
		respectRobots: boolean
		disabledShops: string[]
	}
	schedulerEnabled: boolean
}

export const ROBOT_TOKEN = 'InStockBot'

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
	const env = schema.parse(source)
	const publicOrigin = env.PUBLIC_ORIGIN ? new URL(env.PUBLIC_ORIGIN).origin : null
	const contact = env.SCRAPER_CONTACT_URL ?? `${publicOrigin ?? 'http://localhost:5173'}/robot`
	return {
		env: env.NODE_ENV,
		host: env.HOSTNAME,
		port: env.PORT,
		storage:
			env.STORAGE === 'postgres'
				? { kind: 'postgres', url: env.DATABASE_URL as string, poolMax: env.PG_POOL_MAX }
				: { kind: 'memory' },
		publicOrigin,
		staticDir: env.STATIC_DIR || null,
		migrationsDir: env.MIGRATIONS_DIR,
		logLevel: env.LOG_LEVEL,
		robot: {
			// BR-SHOP-003: the robot always says who it is and where to read about it.
			userAgent: `Mozilla/5.0 (compatible; ${ROBOT_TOKEN}/1.0; +${contact})`,
			agentToken: ROBOT_TOKEN,
			minDelayMs: env.SCRAPER_MIN_DELAY_MS,
			maxConcurrent: env.SCRAPER_MAX_CONCURRENT,
			respectRobots: env.RESPECT_ROBOTS,
			disabledShops: env.DISABLED_SHOPS.split(',')
				.map((s) => s.trim())
				.filter(Boolean),
		},
		schedulerEnabled: env.SCHEDULER_ENABLED,
	}
}

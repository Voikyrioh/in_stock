import { FunctionalError } from '@Voikyrioh/observability'
import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { z } from 'zod'

/**
 * Endpoint input validator (boilerplate `libraries/custom-zod-types`). On
 * failure it throws a FunctionalError (never lets a ZodError escape), so the
 * front receives `invalid-payload` + per-field details.
 */
export function betterZodValidator<T extends z.ZodType, Target extends keyof ValidationTargets>(
	target: Target,
	schema: T,
) {
	return zValidator(target, schema, (result) => {
		if (!result.success) {
			const details = result.error.issues.map((issue) => ({
				field: issue.path.join('.'),
				code: issue.code,
				message: issue.message,
			}))
			throw new FunctionalError('invalid-payload', 'Bad request', details)
		}
	})
}

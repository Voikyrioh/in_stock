import { Logger } from '@Voikyrioh/observability'

/**
 * Periodic job without overlap: a tick is skipped while the previous one runs
 * (BR-FOLLOW-003 relevés, housekeeping).
 */
export function every(name: string, ms: number, task: () => Promise<unknown>) {
	let running = false
	const timer = setInterval(() => {
		if (running) return
		running = true
		task()
			.catch((error: unknown) => Logger.error({ err: error, job: name }, 'Job failed'))
			.finally(() => {
				running = false
			})
	}, ms)
	timer.unref()
	return () => clearInterval(timer)
}

/**
 * Serialises async work per key (one process, mono-instance). Used where two
 * concurrent readings could create the same offer or product twice.
 */
export class KeyedMutex {
	private readonly tails = new Map<string, Promise<unknown>>()

	async run<T>(key: string, task: () => Promise<T>): Promise<T> {
		const previous = this.tails.get(key) ?? Promise.resolve()
		const current = previous.then(task, task)
		const tail = current.catch(() => undefined)
		this.tails.set(key, tail)
		try {
			return await current
		} finally {
			if (this.tails.get(key) === tail) this.tails.delete(key)
		}
	}
}

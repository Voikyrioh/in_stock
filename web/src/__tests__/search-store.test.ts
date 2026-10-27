import type { SearchView } from '@in-stock/shared'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearch } from '../stores/search'

function view(done: boolean): SearchView {
	return {
		id: 'S1',
		query: 'rtx 4070',
		startedAt: '2026-10-27T12:00:00Z',
		done,
		shops: [
			{
				shopId: 'ldlc',
				name: 'LDLC',
				status: done ? 'done' : 'pending',
				offerCount: done ? 1 : 0,
				fetchedAt: null,
			},
		],
		results: [],
	}
}

describe('search store (progressive results)', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it('polls every second until every shop answered', async () => {
		const answers = [view(false), view(false), view(true)]
		const fetchMock = vi.fn(
			async (_url: string) =>
				new Response(JSON.stringify({ search: answers.shift() }), { status: 200 }),
		)
		vi.stubGlobal('fetch', fetchMock)
		const store = useSearch()
		await store.start('rtx 4070')
		expect(store.running).toBe(true)
		await vi.advanceTimersByTimeAsync(1000)
		await vi.advanceTimersByTimeAsync(1000)
		expect(store.view?.done).toBe(true)
		expect(store.running).toBe(false)
		expect(fetchMock).toHaveBeenCalledTimes(3)
		expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/searches/S1')
	})

	it('shows the rate limit wording', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(JSON.stringify({ code: 'rate-limited', message: 'x', reason: 'search' }), {
						status: 429,
					}),
			),
		)
		const store = useSearch()
		await store.start('rtx 4070')
		expect(store.error).toBe("Trop de recherches d'affilée. Réessayez dans une minute.")
	})
})

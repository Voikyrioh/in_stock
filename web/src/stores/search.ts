import { LIMITS, type SearchView } from '@in-stock/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { endpoints } from '../api/endpoints'
import { errorMessage } from '../api/http'

/**
 * A running search: started once, then polled every second until every shop
 * answered (ADR-0004, progressive results).
 */
export const useSearch = defineStore('search', () => {
	const view = ref<SearchView | null>(null)
	const error = ref<string | null>(null)
	const running = ref(false)
	let timer: ReturnType<typeof setTimeout> | null = null
	let generation = 0

	function stop() {
		if (timer) clearTimeout(timer)
		timer = null
		running.value = false
	}

	async function start(query: string) {
		stop()
		const current = ++generation
		error.value = null
		view.value = null
		running.value = true
		try {
			const { search } = await endpoints.startSearch(query)
			if (current !== generation) return
			view.value = search
			schedule(current)
		} catch (e) {
			if (current !== generation) return
			error.value = errorMessage(e)
			running.value = false
		}
	}

	function schedule(current: number) {
		if (!view.value || view.value.done) {
			running.value = false
			return
		}
		timer = setTimeout(() => void poll(current), LIMITS.searchPollMs)
	}

	async function poll(current: number) {
		if (!view.value || current !== generation) return
		try {
			const { search } = await endpoints.getSearch(view.value.id)
			if (current !== generation) return
			view.value = search
		} catch (e) {
			if (current !== generation) return
			// Results already shown stay; the next start retries.
			error.value = errorMessage(e)
			running.value = false
			return
		}
		schedule(current)
	}

	return { view, error, running, start, stop }
})

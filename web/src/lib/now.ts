import { onBeforeUnmount, ref } from 'vue'

/** Current time refreshed every 30 s, so « il y a 4 min » stays true on an open page. */
export function useNow(intervalMs = 30_000) {
	const now = ref(new Date())
	const timer = setInterval(() => {
		now.value = new Date()
	}, intervalMs)
	onBeforeUnmount(() => clearInterval(timer))
	return now
}

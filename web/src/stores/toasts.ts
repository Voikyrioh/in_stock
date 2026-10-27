import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
	id: number
	message: string
	kind: 'success' | 'info' | 'error'
	action?: { label: string; run: () => void }
}

/** Non-blocking messages (success, undo). Announced in an aria-live region. */
export const useToasts = defineStore('toasts', () => {
	const toasts = ref<Toast[]>([])
	let next = 1

	function show(
		message: string,
		kind: Toast['kind'] = 'info',
		options: { action?: Toast['action']; ms?: number } = {},
	) {
		const id = next++
		toasts.value.push({ id, message, kind, action: options.action })
		setTimeout(() => dismiss(id), options.ms ?? 5000)
		return id
	}

	function dismiss(id: number) {
		toasts.value = toasts.value.filter((t) => t.id !== id)
	}

	return { toasts, show, dismiss }
})

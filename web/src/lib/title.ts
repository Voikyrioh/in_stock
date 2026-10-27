import { watchEffect } from 'vue'

/** « Résultats pour rtx 4070 · In Stock ». */
export function usePageTitle(title: () => string | null) {
	watchEffect(() => {
		const value = title()
		document.title = value ? `${value} · In Stock` : 'In Stock'
	})
}

import type { FollowView } from '@in-stock/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { endpoints } from '../api/endpoints'

export const useFollows = defineStore('follows', () => {
	const list = ref<FollowView[]>([])
	const loaded = ref(false)

	async function load() {
		list.value = (await endpoints.follows()).follows
		loaded.value = true
	}

	async function follow(productId: string) {
		await endpoints.follow(productId)
		loaded.value = false
	}

	async function unfollow(productId: string) {
		await endpoints.unfollow(productId)
		list.value = list.value.filter((f) => f.product.id !== productId)
	}

	function reset() {
		list.value = []
		loaded.value = false
	}

	return { list, loaded, load, follow, unfollow, reset }
})

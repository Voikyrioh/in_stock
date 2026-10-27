<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { errorMessage } from '../api/http'
import AppButton from '../components/atoms/AppButton.vue'
import SkeletonBlock from '../components/atoms/SkeletonBlock.vue'
import FollowCard from '../components/molecules/FollowCard.vue'
import { MESSAGES } from '../lib/copy'
import { useNow } from '../lib/now'
import { usePageTitle } from '../lib/title'
import { useFollows } from '../stores/follows'
import { useToasts } from '../stores/toasts'

usePageTitle(() => 'Mes suivis')
const follows = useFollows()
const toasts = useToasts()
const now = useNow()
const error = ref<string | null>(null)
const loading = ref(true)

async function load() {
	loading.value = true
	error.value = null
	try {
		await follows.load()
	} catch (e) {
		error.value = errorMessage(e)
	} finally {
		loading.value = false
	}
}

async function unfollow(productId: string) {
	const removed = follows.list.find((f) => f.product.id === productId)
	if (!removed) return
	try {
		await follows.unfollow(productId)
		toasts.show(MESSAGES.unfollowed(removed.product.name), 'info', {
			action: {
				label: 'Annuler',
				run: () => {
					void follows.follow(productId).then(load)
				},
			},
		})
	} catch (e) {
		toasts.show(errorMessage(e), 'error')
	}
}

onMounted(load)
</script>

<template>
	<div class="wrap page">
		<div class="head">
			<h2>Mes suivis</h2>
			<p v-if="follows.loaded" class="muted">
				{{ follows.list.length }} produit{{ follows.list.length > 1 ? 's' : '' }} suivi{{ follows.list.length > 1 ? 's' : '' }}
			</p>
		</div>
		<div v-if="error" class="panel">
			<p role="alert">{{ error }}</p>
			<div><AppButton variant="ghost" @click="load">Réessayer</AppButton></div>
		</div>
		<div v-else-if="loading && !follows.loaded" class="grid">
			<SkeletonBlock v-for="n in 3" :key="n" height="l" />
		</div>
		<div v-else-if="follows.list.length === 0" class="panel empty">
			<p>{{ MESSAGES.noFollow }}</p>
			<div><AppButton :to="{ name: 'home' }">Chercher un produit</AppButton></div>
		</div>
		<div v-else class="grid">
			<FollowCard v-for="follow in follows.list" :key="follow.product.id" :follow="follow" :now="now" @unfollow="unfollow" />
		</div>
	</div>
</template>

<style scoped>
.head {
	display: grid;
	gap: 4px;
}
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 14px;
}
.empty {
	max-width: 560px;
}
</style>

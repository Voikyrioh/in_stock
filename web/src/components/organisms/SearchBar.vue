<script setup lang="ts">
import { LIMITS } from '@in-stock/shared'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MESSAGES } from '../../lib/copy'
import AppButton from '../atoms/AppButton.vue'
import AppIcon from '../atoms/AppIcon.vue'

const props = withDefaults(defineProps<{ initial?: string; large?: boolean }>(), {
	initial: '',
	large: false,
})
const router = useRouter()
const query = ref(props.initial)
const error = ref<string | null>(null)

watch(
	() => props.initial,
	(value) => {
		query.value = value
	},
)

/** BR-SEARCH-001 on the client side; a pasted link goes to the add-by-link flow. */
async function submit() {
	const raw = query.value.trim()
	if (/^https?:\/\//i.test(raw)) {
		error.value = null
		await router.push({ name: 'add', query: { url: raw } })
		return
	}
	const cleaned = raw.replace(/\s+/g, ' ')
	if (cleaned.length < LIMITS.queryMin) {
		error.value = MESSAGES.queryTooShort
		return
	}
	if (cleaned.length > LIMITS.queryMax) {
		error.value = MESSAGES.queryTooLong
		return
	}
	error.value = null
	await router.push({ name: 'search', query: { q: cleaned } })
}
</script>

<template>
	<div class="search-block">
		<form class="search" :class="{ large: props.large }" role="search" novalidate @submit.prevent="submit">
			<label for="search-query" class="sr-only">Que cherchez-vous ?</label>
			<AppIcon name="search" class="lead" />
			<input
				id="search-query"
				v-model="query"
				type="search"
				autocomplete="off"
				placeholder="rtx 4070, ryzen 7 9800x3d, ssd 2 To…"
				:aria-invalid="error ? 'true' : undefined"
				:aria-describedby="error ? 'search-error' : undefined"
			/>
			<AppButton type="submit">Chercher</AppButton>
		</form>
		<span v-if="error" id="search-error" class="error" role="alert">{{ error }}</span>
	</div>
</template>

<style scoped>
.search-block {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 6px;
}
.search {
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--r-m);
	padding: 4px 4px 4px 12px;
}
.search.large {
	border: 2px solid var(--ink);
	padding: 6px 6px 6px 14px;
}
.search:focus-within {
	outline: 3px solid var(--accent-soft);
}
.lead {
	color: var(--ink-3);
}
input {
	flex: 1;
	/* width 0 + flex 1: the field fills the row but never forces it wider (phones). */
	width: 0;
	min-width: 0;
	border: 0;
	background: transparent;
	font: 500 16px/1.2 var(--font-body);
	padding: 9px 4px;
}
.large input {
	font-size: 18px;
	padding: 10px 4px;
}
input:focus {
	outline: none;
}
.error {
	font-size: 13px;
	font-weight: 600;
	color: var(--out);
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'

/** Native <dialog>: focus trap, Escape and backdrop handled by the browser. */
const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

watch(
	() => props.open,
	(open) => {
		if (!dialog.value) return
		if (open && !dialog.value.open) dialog.value.showModal?.()
		if (!open && dialog.value.open) dialog.value.close()
	},
)
</script>

<template>
	<dialog ref="dialog" class="dialog" :aria-label="props.title" @close="emit('close')">
		<h2>{{ props.title }}</h2>
		<slot />
	</dialog>
</template>

<style scoped>
.dialog {
	border: 1px solid var(--line);
	border-radius: var(--r-m);
	background: var(--surface);
	color: var(--ink);
	padding: 24px;
	width: min(440px, calc(100vw - 32px));
	box-shadow: var(--shadow-pop);
}
.dialog[open] {
	display: grid;
	gap: 14px;
}
.dialog::backdrop {
	background: rgb(15 18 24 / 55%);
}
</style>

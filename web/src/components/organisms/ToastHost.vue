<script setup lang="ts">
import { useToasts } from '../../stores/toasts'
import AppIcon from '../atoms/AppIcon.vue'

const toasts = useToasts()
</script>

<template>
	<div class="host" role="status" aria-live="polite">
		<div v-for="toast in toasts.toasts" :key="toast.id" class="toast" :class="toast.kind">
			<span>{{ toast.message }}</span>
			<button
				v-if="toast.action"
				type="button"
				class="action"
				@click="
					toast.action.run();
					toasts.dismiss(toast.id)
				"
			>
				{{ toast.action.label }}
			</button>
			<button type="button" class="close" aria-label="Fermer" @click="toasts.dismiss(toast.id)"><AppIcon name="close" /></button>
		</div>
	</div>
</template>

<style scoped>
.host {
	position: fixed;
	right: max(16px, env(safe-area-inset-right, 0px));
	bottom: max(16px, env(safe-area-inset-bottom, 0px));
	left: max(16px, env(safe-area-inset-left, 0px));
	display: grid;
	justify-items: end;
	gap: 8px;
	pointer-events: none;
	z-index: 20;
}
.toast {
	pointer-events: auto;
	display: flex;
	align-items: center;
	gap: 12px;
	max-width: 440px;
	background: var(--ink);
	color: var(--paper);
	border-radius: var(--r-m);
	padding: 10px 10px 10px 14px;
	box-shadow: var(--shadow-pop);
	font-size: 14px;
}
.toast.success {
	border-left: 4px solid var(--ok);
}
.toast.error {
	border-left: 4px solid var(--out);
}
.action {
	border: 0;
	background: transparent;
	color: var(--tag);
	font-weight: 700;
	cursor: pointer;
}
.close {
	border: 0;
	background: transparent;
	color: inherit;
	cursor: pointer;
	display: inline-flex;
	padding: 4px;
}
</style>

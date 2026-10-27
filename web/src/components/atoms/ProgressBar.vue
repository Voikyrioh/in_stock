<script setup lang="ts">
const props = defineProps<{ value: number; max: number; label: string }>()
</script>

<template>
	<progress class="bar" :value="props.value" :max="Math.max(props.max, 1)" :aria-label="props.label"></progress>
</template>

<style scoped>
.bar {
	display: block;
	width: 100%;
	height: 6px;
	appearance: none;
	border: 0;
	border-radius: 999px;
	background: var(--surface-2);
	overflow: hidden;
}
.bar::-webkit-progress-bar {
	background: var(--surface-2);
}
.bar::-webkit-progress-value {
	background: var(--accent);
	transition: width 0.3s ease;
}
.bar::-moz-progress-bar {
	background: var(--accent);
}
</style>

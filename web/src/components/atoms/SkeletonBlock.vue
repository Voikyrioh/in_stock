<script setup lang="ts">
const props = withDefaults(defineProps<{ height?: 's' | 'm' | 'l' }>(), { height: 'm' })
</script>

<template>
	<div class="skeleton" :class="props.height" aria-hidden="true"></div>
</template>

<style scoped>
.skeleton {
	border-radius: var(--r-m);
	background: linear-gradient(90deg, var(--surface-2), var(--surface), var(--surface-2));
	background-size: 200% 100%;
	animation: shimmer 1.4s linear infinite;
}
.s {
	height: 24px;
}
.m {
	height: 88px;
}
.l {
	height: 220px;
}
@keyframes shimmer {
	to {
		background-position: -200% 0;
	}
}
</style>

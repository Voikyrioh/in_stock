<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(
	defineProps<{
		variant?: 'primary' | 'ghost' | 'danger'
		size?: 'm' | 's'
		type?: 'button' | 'submit'
		to?: RouteLocationRaw
		href?: string
		disabled?: boolean
		block?: boolean
	}>(),
	{
		variant: 'primary',
		size: 'm',
		type: 'button',
		to: undefined,
		href: undefined,
		disabled: false,
		block: false,
	},
)
</script>

<template>
	<RouterLink v-if="props.to" :to="props.to" class="btn" :class="[props.variant, props.size, { block: props.block }]">
		<slot />
	</RouterLink>
	<a
		v-else-if="props.href"
		:href="props.href"
		target="_blank"
		rel="noopener noreferrer nofollow"
		referrerpolicy="no-referrer"
		class="btn"
		:class="[props.variant, props.size, { block: props.block }]"
	>
		<slot />
	</a>
	<button
		v-else
		:type="props.type"
		:disabled="props.disabled"
		class="btn"
		:class="[props.variant, props.size, { block: props.block }]"
	>
		<slot />
	</button>
</template>

<style scoped>
.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 1px solid transparent;
	border-radius: var(--r-s);
	padding: 10px 16px;
	font: 600 15px/1.1 var(--font-body);
	cursor: pointer;
	text-decoration: none;
	white-space: nowrap;
	transition: background-color 0.15s ease, border-color 0.15s ease;
}
.primary {
	background: var(--accent);
	color: var(--accent-ink);
}
.primary:hover {
	background: color-mix(in srgb, var(--accent) 88%, var(--ink));
}
.ghost {
	background: transparent;
	color: var(--ink);
	border-color: var(--line);
}
.ghost:hover {
	background: var(--surface-2);
}
.danger {
	background: var(--out);
	color: var(--surface);
}
.s {
	padding: 7px 12px;
	font-size: 14px;
}
.block {
	width: 100%;
}
.btn:disabled {
	opacity: 0.6;
	cursor: wait;
}
</style>

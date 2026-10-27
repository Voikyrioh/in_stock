<script setup lang="ts">
import { computed } from 'vue'

/** The only place with SVG paths (ADR-0004: an SVG is a dedicated atom). */
const PATHS = {
	search:
		'M10.5 3a7.5 7.5 0 0 1 5.96 12.05l4.25 4.24-1.42 1.42-4.24-4.25A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z',
	link: 'M10.6 13.4a1 1 0 0 1 0-1.4l3.4-3.4a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0Zm-2.8 5.7a4 4 0 0 1-2.9-6.9l2.1-2.1 1.4 1.4-2.1 2.1a2 2 0 1 0 2.8 2.8l2.1-2.1 1.4 1.4-2.1 2.1a4 4 0 0 1-2.7 1.3Zm8.4-6.5-1.4-1.4 2.1-2.1a2 2 0 1 0-2.8-2.8l-2.1 2.1-1.4-1.4 2.1-2.1a4 4 0 0 1 5.6 5.6l-2.1 2.1Z',
	refresh: 'M12 4a8 8 0 0 1 7.4 5H17v2h6V5h-2v2.3A10 10 0 1 0 22 12h-2a8 8 0 1 1-8-8Z',
	external:
		'M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
	bell: 'M12 2a6 6 0 0 1 6 6v4.6l1.7 3.4H4.3L6 12.6V8a6 6 0 0 1 6-6Zm-2 16h4a2 2 0 0 1-4 0Z',
	close:
		'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
	eye: 'M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
	user: 'M12 3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 11c4.4 0 8 2.2 8 5v2H4v-2c0-2.8 3.6-5 8-5Z',
} as const

const props = withDefaults(defineProps<{ name: keyof typeof PATHS; label?: string }>(), {
	label: undefined,
})
const path = computed(() => PATHS[props.name])
</script>

<template>
	<svg
		class="icon"
		viewBox="0 0 24 24"
		:role="props.label ? 'img' : undefined"
		:aria-label="props.label"
		:aria-hidden="props.label ? undefined : 'true'"
		focusable="false"
	>
		<path :d="path" fill="currentColor" />
	</svg>
</template>

<style scoped>
.icon {
	width: 1.15em;
	height: 1.15em;
	flex: none;
}
</style>

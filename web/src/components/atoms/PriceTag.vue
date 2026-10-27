<script setup lang="ts">
import { computed } from 'vue'
import { priceParts } from '../../lib/format'

const props = withDefaults(
	defineProps<{ cents: number | null; currency?: string; size?: 'm' | 'l' }>(),
	{
		currency: 'EUR',
		size: 'm',
	},
)
const parts = computed(() =>
	props.cents === null ? null : priceParts(props.cents, props.currency),
)
</script>

<template>
	<span v-if="parts" class="price" :class="props.size">{{ parts.units }}<small>{{ parts.decimals }}</small></span>
	<span v-else class="price unknown">Prix non communiqué</span>
</template>

<style scoped>
.price {
	font: 600 20px/1 var(--font-data);
	font-variant-numeric: tabular-nums;
	letter-spacing: -0.02em;
	white-space: nowrap;
	color: var(--ink);
}
.price.l {
	font-size: 26px;
	color: var(--tag-ink);
}
small {
	font-size: 0.62em;
	vertical-align: 0.55em;
	margin-left: 1px;
}
.unknown {
	font: 500 13px/1.2 var(--font-body);
	color: var(--ink-3);
	letter-spacing: 0;
	white-space: normal;
}
</style>

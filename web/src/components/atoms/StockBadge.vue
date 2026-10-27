<script setup lang="ts">
import type { StockState } from '@in-stock/shared'
import { computed } from 'vue'
import { STOCK_LABELS } from '../../lib/copy'

const props = defineProps<{ stock: StockState }>()
const label = computed(() => STOCK_LABELS[props.stock])
</script>

<template>
	<span class="stock" :class="props.stock">{{ label }}</span>
</template>

<style scoped>
.stock {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 600 13px/1 var(--font-body);
	padding: 5px 9px 5px 7px;
	border-radius: 999px;
	white-space: nowrap;
}
.stock::before {
	content: "";
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: currentColor;
}
.in_stock {
	color: var(--ok);
	background: var(--ok-soft);
}
.limited {
	color: var(--low);
	background: var(--low-soft);
}
.preorder {
	color: var(--pre);
	background: var(--pre-soft);
}
.backorder {
	color: var(--back);
	background: var(--back-soft);
}
.out_of_stock {
	color: var(--out);
	background: var(--out-soft);
}
/* The shape carries the state too, not only the colour. */
.out_of_stock::before {
	border-radius: 2px;
	transform: rotate(45deg);
}
.discontinued,
.unknown {
	color: var(--off);
	background: var(--off-soft);
}
.unknown::before {
	background: transparent;
	border: 2px solid currentColor;
}
</style>

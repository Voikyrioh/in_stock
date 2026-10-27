<script setup lang="ts">
import type { SearchShopView } from '@in-stock/shared'
import { searchStatusLabel } from '../../lib/copy'

const props = defineProps<{ shops: SearchShopView[] }>()

function dot(status: SearchShopView['status']): string {
	if (status === 'done' || status === 'cached') return 'ok'
	if (status === 'pending') return 'wait'
	if (status === 'timeout') return 'warn'
	if (status === 'forbidden') return 'ban'
	return 'ko'
}
</script>

<template>
	<aside class="report" aria-labelledby="report-title">
		<h3 id="report-title">Boutiques interrogées</h3>
		<ul>
			<li v-for="shop in props.shops" :key="shop.shopId">
				<span class="name"><span class="dot" :class="dot(shop.status)"></span>{{ shop.name }}</span>
				<span class="muted">{{ searchStatusLabel(shop.status, shop.offerCount) }}</span>
			</li>
		</ul>
	</aside>
</template>

<style scoped>
.report {
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--r-m);
	padding: 16px;
	display: grid;
	gap: 10px;
	align-content: start;
}
ul {
	list-style: none;
	padding: 0;
	margin: 0;
	display: grid;
	gap: 8px;
	font-size: 14px;
}
li {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: baseline;
	gap: 12px;
}
.name {
	white-space: nowrap;
}
.muted {
	text-align: right;
	font-size: 13px;
}
.dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	margin-right: 6px;
}
.ok {
	background: var(--ok);
}
.warn {
	background: var(--low);
}
.ko {
	background: var(--out);
}
.wait {
	background: var(--line);
}
.ban {
	background: var(--off);
}
</style>

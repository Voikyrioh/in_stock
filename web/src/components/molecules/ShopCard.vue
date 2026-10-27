<script setup lang="ts">
import type { ShopView } from '@in-stock/shared'
import { SHOP_STATE_LABELS } from '../../lib/copy'
import { relativeTime } from '../../lib/format'

const props = defineProps<{ shop: ShopView; now: Date }>()
</script>

<template>
	<article class="shop">
		<div class="head">
			<strong>{{ props.shop.name }}</strong>
			<span class="cap">{{ props.shop.country }}</span>
		</div>
		<div class="caps">
			<span v-if="props.shop.capabilities.includes('search')" class="cap">Recherche</span>
			<span v-if="props.shop.capabilities.includes('url')" class="cap">Ajout par lien</span>
		</div>
		<span class="state"><span class="dot" :class="props.shop.state"></span>{{ SHOP_STATE_LABELS[props.shop.state] }}</span>
		<span v-if="props.shop.lastSuccessAt" class="muted">
			Dernier relevé réussi {{ relativeTime(props.shop.lastSuccessAt, props.now) }}
		</span>
		<a :href="props.shop.homepage" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">Ouvrir le site</a>
	</article>
</template>

<style scoped>
.shop {
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--r-m);
	padding: 14px 16px;
	display: grid;
	gap: 8px;
	align-content: start;
}
.head {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: 8px;
}
strong {
	font: 700 16px/1.1 var(--font-display);
}
.caps {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}
.cap {
	font: 500 11px/1 var(--font-data);
	padding: 4px 7px;
	border-radius: 4px;
	background: var(--surface-2);
	color: var(--ink-2);
}
.state {
	font-size: 14px;
	font-weight: 600;
	display: flex;
	align-items: center;
}
.dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	margin-right: 6px;
	background: var(--line);
}
.operational {
	background: var(--ok);
}
.degraded {
	background: var(--low);
}
.down {
	background: var(--out);
}
.forbidden {
	background: var(--off);
}
.muted {
	font-size: 13px;
}
a {
	font-size: 14px;
}
</style>

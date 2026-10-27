<script setup lang="ts">
import type { OfferView } from '@in-stock/shared'
import { relativeTime } from '../../lib/format'
import AppButton from '../atoms/AppButton.vue'
import PriceTag from '../atoms/PriceTag.vue'

const props = defineProps<{ offer: OfferView; now: Date }>()
</script>

<template>
	<div class="best">
		<div class="tag"><PriceTag :cents="props.offer.priceCents" :currency="props.offer.currency" size="l" /></div>
		<div class="text">
			<strong>Meilleur prix en stock</strong>
			<span class="muted">chez {{ props.offer.shopName }}, relevé {{ relativeTime(props.offer.lastCheckedAt, props.now) }}</span>
		</div>
		<AppButton :href="props.offer.url">Voir chez {{ props.offer.shopName }}</AppButton>
	</div>
</template>

<style scoped>
.best {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	gap: 16px;
	align-items: center;
	background: var(--surface);
	border: 2px solid var(--ok);
	border-radius: var(--r-m);
	padding: 16px;
}
.tag {
	background: var(--tag);
	padding: 10px 14px 10px 22px;
	border-radius: 4px 8px 8px 4px;
	clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%);
}
.text {
	display: grid;
	gap: 2px;
	min-width: 0;
}
@media (max-width: 560px) {
	.best {
		grid-template-columns: 1fr;
		justify-items: start;
	}
}
</style>

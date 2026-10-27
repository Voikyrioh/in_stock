<script setup lang="ts">
import type { FollowView } from '@in-stock/shared'
import { computed } from 'vue'
import { relativeTime } from '../../lib/format'
import AppButton from '../atoms/AppButton.vue'
import PriceTag from '../atoms/PriceTag.vue'
import StockBadge from '../atoms/StockBadge.vue'

const props = defineProps<{ follow: FollowView; now: Date }>()
const emit = defineEmits<{ unfollow: [productId: string] }>()

const stockLine = computed(() =>
	props.follow.inStockCount > 0
		? `En stock dans ${props.follow.inStockCount} boutique${props.follow.inStockCount > 1 ? 's' : ''}`
		: "Aucune boutique ne l'a en stock",
)
</script>

<template>
	<article class="follow">
		<div class="top">
			<RouterLink class="name" :to="{ name: 'product', params: { id: props.follow.product.id } }">
				{{ props.follow.product.name }}
			</RouterLink>
			<StockBadge :stock="props.follow.bestOffer?.stock ?? (props.follow.inStockCount > 0 ? 'in_stock' : 'out_of_stock')" />
		</div>
		<PriceTag :cents="props.follow.bestOffer?.priceCents ?? null" :currency="props.follow.bestOffer?.currency" />
		<span class="muted">{{ stockLine }} · relevé {{ relativeTime(props.follow.lastCheckedAt, props.now) }}</span>
		<div>
			<AppButton variant="ghost" size="s" @click="emit('unfollow', props.follow.product.id)">Ne plus suivre</AppButton>
		</div>
	</article>
</template>

<style scoped>
.follow {
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--r-m);
	padding: 16px;
	display: grid;
	gap: 10px;
	align-content: start;
	min-width: 0;
}
.top {
	display: flex;
	justify-content: space-between;
	gap: 10px;
	align-items: start;
}
.name {
	font-weight: 700;
	color: var(--ink);
	text-decoration: none;
	overflow-wrap: anywhere;
}
.name:hover {
	text-decoration: underline;
}
.muted {
	font-size: 14px;
}
</style>

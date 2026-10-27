<script setup lang="ts">
import type { OfferView, ProductSummary } from '@in-stock/shared'
import { clockTime } from '../../lib/format'
import PriceTag from '../atoms/PriceTag.vue'
import StockBadge from '../atoms/StockBadge.vue'

const props = defineProps<{ offer: OfferView; product: ProductSummary }>()
</script>

<template>
	<article class="offer" :class="{ dim: props.offer.stock === 'out_of_stock' || props.offer.stock === 'discontinued' }">
		<div class="thumb">
			<img
				v-if="props.product.imageUrl"
				:src="props.product.imageUrl"
				alt=""
				loading="lazy"
				referrerpolicy="no-referrer"
			/>
		</div>
		<div class="info">
			<RouterLink class="title" :to="{ name: 'product', params: { id: props.product.id } }">{{ props.offer.title }}</RouterLink>
			<div class="meta">
				<span class="shop-name">{{ props.offer.shopName }}</span>
				<span v-if="props.offer.lastCheckedAt">relevé à {{ clockTime(props.offer.lastCheckedAt) }}</span>
				<a :href="props.offer.url" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">
					Voir chez {{ props.offer.shopName }}
				</a>
			</div>
		</div>
		<div class="side">
			<PriceTag :cents="props.offer.priceCents" :currency="props.offer.currency" />
			<StockBadge :stock="props.offer.stock" />
		</div>
	</article>
</template>

<style scoped>
.offer {
	display: grid;
	grid-template-columns: 64px minmax(0, 1fr) auto;
	gap: 14px;
	align-items: center;
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--r-m);
	padding: 12px 14px;
}
.thumb {
	width: 64px;
	height: 64px;
	border-radius: var(--r-s);
	background: var(--surface-2);
	display: grid;
	place-items: center;
	overflow: hidden;
}
.thumb img {
	width: 100%;
	height: 100%;
	object-fit: contain;
	background: #fff;
}
.info {
	display: grid;
	gap: 6px;
	min-width: 0;
}
.title {
	font-weight: 600;
	color: var(--ink);
	text-decoration: none;
	overflow-wrap: anywhere;
}
.title:hover {
	text-decoration: underline;
}
.meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 12px;
	align-items: center;
	font-size: 13px;
	color: var(--ink-3);
}
.shop-name {
	font: 600 12px/1 var(--font-data);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--ink-2);
}
.side {
	display: grid;
	justify-items: end;
	gap: 8px;
}
.dim {
	opacity: 0.72;
}
@media (max-width: 560px) {
	.offer {
		grid-template-columns: 48px minmax(0, 1fr);
	}
	.thumb {
		width: 48px;
		height: 48px;
	}
	.side {
		grid-column: 1 / -1;
		grid-template-columns: auto auto;
		justify-content: space-between;
		align-items: center;
	}
}
</style>

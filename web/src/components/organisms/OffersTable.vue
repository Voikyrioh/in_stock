<script setup lang="ts">
import type { OfferView } from '@in-stock/shared'
import { MESSAGES } from '../../lib/copy'
import { relativeTime } from '../../lib/format'
import PriceTag from '../atoms/PriceTag.vue'
import SkeletonBlock from '../atoms/SkeletonBlock.vue'
import StockBadge from '../atoms/StockBadge.vue'

const props = defineProps<{ offers: OfferView[]; refreshing: boolean; now: Date }>()
</script>

<template>
	<div class="table-wrap">
		<table>
			<caption class="sr-only">Offres par boutique</caption>
			<thead>
				<tr>
					<th scope="col">Boutique</th>
					<th scope="col">Stock</th>
					<th scope="col" class="num">Prix</th>
					<th scope="col">Relevé</th>
					<th scope="col"><span class="sr-only">Lien</span></th>
				</tr>
			</thead>
			<tbody :aria-busy="props.refreshing">
				<tr v-for="offer in props.offers" :key="offer.id">
					<td class="shop-name">{{ offer.shopName }}</td>
					<td>
						<SkeletonBlock v-if="props.refreshing" height="s" />
						<StockBadge v-else :stock="offer.stock" />
					</td>
					<td class="num">
						<SkeletonBlock v-if="props.refreshing" height="s" />
						<PriceTag v-else :cents="offer.priceCents" :currency="offer.currency" />
					</td>
					<td>
						{{ relativeTime(offer.lastCheckedAt, props.now) }}
						<div v-if="offer.stale" class="stale">{{ MESSAGES.staleOffer }}</div>
					</td>
					<td>
						<a :href="offer.url" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">
							Voir chez {{ offer.shopName }}
						</a>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped>
.table-wrap {
	/* Containing block of the visually hidden caption: it must scroll with the table. */
	position: relative;
	overflow-x: auto;
	border: 1px solid var(--line);
	border-radius: var(--r-m);
	background: var(--surface);
}
table {
	width: 100%;
	border-collapse: collapse;
	min-width: 560px;
}
th,
td {
	text-align: left;
	padding: 12px 14px;
	border-bottom: 1px solid var(--line);
	font-size: 14px;
	vertical-align: middle;
}
th {
	font: 600 12px/1 var(--font-data);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--ink-3);
}
tr:last-child td {
	border-bottom: 0;
}
.num {
	text-align: right;
}
.shop-name {
	font: 600 12px/1 var(--font-data);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--ink-2);
}
.stale {
	font-size: 12px;
	color: var(--low);
	font-weight: 600;
}
</style>

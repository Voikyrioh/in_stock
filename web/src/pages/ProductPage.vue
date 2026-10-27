<script setup lang="ts">
import type { ProductResponse } from '@in-stock/shared'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { endpoints } from '../api/endpoints'
import { ApiError, errorMessage } from '../api/http'
import AppButton from '../components/atoms/AppButton.vue'
import AppIcon from '../components/atoms/AppIcon.vue'
import SkeletonBlock from '../components/atoms/SkeletonBlock.vue'
import FollowButton from '../components/molecules/FollowButton.vue'
import BestOfferCard from '../components/organisms/BestOfferCard.vue'
import OffersTable from '../components/organisms/OffersTable.vue'
import { MESSAGES } from '../lib/copy'
import { useNow } from '../lib/now'
import { usePageTitle } from '../lib/title'
import { useToasts } from '../stores/toasts'

const route = useRoute()
const toasts = useToasts()
const now = useNow()
const data = ref<ProductResponse | null>(null)
const notFound = ref(false)
const failed = ref<string | null>(null)
const refreshing = ref(false)
let poll: ReturnType<typeof setTimeout> | null = null
let polls = 0

const id = computed(() => String(route.params.id))
usePageTitle(() => (notFound.value ? MESSAGES.productNotFound : (data.value?.product.name ?? null)))

async function load() {
	try {
		data.value = await endpoints.getProduct(id.value)
		notFound.value = false
		failed.value = null
		// BR-OFFER-002: the server reads stale offers in the background; poll until it is done.
		if (data.value.refreshing && polls < 15) {
			polls++
			poll = setTimeout(() => void load(), 2000)
		}
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) notFound.value = true
		else if (error instanceof ApiError && error.status === 400) notFound.value = true
		else failed.value = errorMessage(error)
	}
}

async function refresh() {
	refreshing.value = true
	try {
		data.value = await endpoints.refreshProduct(id.value)
	} catch (error) {
		toasts.show(
			errorMessage(error),
			error instanceof ApiError && error.status === 429 ? 'info' : 'error',
		)
	} finally {
		refreshing.value = false
	}
}

watch(
	id,
	() => {
		if (poll) clearTimeout(poll)
		polls = 0
		data.value = null
		void load()
	},
	{ immediate: true },
)
onBeforeUnmount(() => {
	if (poll) clearTimeout(poll)
})

const product = computed(() => data.value?.product ?? null)
const offerRefreshing = computed(() => refreshing.value || Boolean(data.value?.refreshing))
</script>

<template>
	<div class="wrap page">
		<div v-if="notFound" class="panel missing">
			<h2>{{ MESSAGES.productNotFound }}</h2>
			<p class="muted">Ce produit n'existe pas ou plus.</p>
			<RouterLink :to="{ name: 'home' }">Revenir à la recherche</RouterLink>
		</div>

		<div v-else-if="failed && !data" class="panel">
			<p role="alert">{{ failed }}</p>
			<div><AppButton variant="ghost" @click="load">Réessayer</AppButton></div>
		</div>

		<template v-else-if="data && product">
			<section class="product">
				<div class="image">
					<img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" referrerpolicy="no-referrer" />
					<span v-else class="muted">Pas d'image</span>
				</div>
				<div class="head">
					<span v-if="product.brand" class="eyebrow">{{ product.brand }}</span>
					<h2>{{ product.name }}</h2>
					<div v-if="product.mpn || product.gtin" class="refs">
						<span v-if="product.mpn">Réf. fabricant {{ product.mpn }}</span>
						<span v-if="product.gtin">EAN {{ product.gtin.replace(/^0+(?=\d{13}$)/, '') }}</span>
					</div>
					<BestOfferCard v-if="data.bestOffer" :offer="data.bestOffer" :now="now" />
					<p v-else class="none">{{ MESSAGES.noOfferInStock }}</p>
					<div class="actions">
						<AppButton variant="ghost" :disabled="offerRefreshing" @click="refresh">
							<AppIcon name="refresh" />{{ offerRefreshing ? 'Actualisation…' : 'Actualiser' }}
						</AppButton>
						<FollowButton
							:product-id="product.id"
							:product-name="product.name"
							:followed="data.followed"
							@change="(value) => data && (data.followed = value)"
						/>
					</div>
				</div>
			</section>
			<OffersTable :offers="data.offers" :refreshing="offerRefreshing" :now="now" />
		</template>

		<template v-else>
			<SkeletonBlock height="l" />
			<SkeletonBlock />
		</template>
	</div>
</template>

<style scoped>
.product {
	display: grid;
	grid-template-columns: 220px minmax(0, 1fr);
	gap: 28px;
	align-items: start;
}
.image {
	aspect-ratio: 1;
	max-width: 100%;
	border-radius: var(--r-m);
	background: #fff;
	border: 1px solid var(--line);
	display: grid;
	place-items: center;
	overflow: hidden;
}
.image img {
	width: 100%;
	height: 100%;
	object-fit: contain;
}
.head {
	display: grid;
	gap: 12px;
	min-width: 0;
}
.refs {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 16px;
	font: 500 13px/1 var(--font-data);
	color: var(--ink-3);
}
.none {
	font-weight: 600;
	color: var(--ink-2);
}
.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}
.missing {
	max-width: 520px;
}
@media (max-width: 720px) {
	.product {
		grid-template-columns: 1fr;
	}
	.image {
		max-width: 240px;
	}
}
</style>

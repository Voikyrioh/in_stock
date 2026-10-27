<script setup lang="ts">
import type { ShopView } from '@in-stock/shared'
import { onMounted, ref } from 'vue'
import { endpoints } from '../api/endpoints'
import SkeletonBlock from '../components/atoms/SkeletonBlock.vue'
import ShopCard from '../components/molecules/ShopCard.vue'
import { MESSAGES } from '../lib/copy'
import { useNow } from '../lib/now'
import { usePageTitle } from '../lib/title'

usePageTitle(() => 'Boutiques couvertes')
const shops = ref<ShopView[] | null>(null)
const error = ref(false)
const now = useNow()

onMounted(async () => {
	try {
		shops.value = (await endpoints.shops()).shops
	} catch {
		error.value = true
	}
})
</script>

<template>
	<div class="wrap page">
		<div class="head">
			<h2>Boutiques couvertes</h2>
			<p class="muted">
				In Stock lit les boutiques ci-dessous. Vous pouvez aussi ajouter un produit de n'importe quelle autre boutique par son lien.
			</p>
		</div>
		<p v-if="error" class="panel" role="alert">{{ MESSAGES.shopsUnavailable }}</p>
		<div class="grid">
			<template v-if="!shops && !error">
				<SkeletonBlock v-for="n in 6" :key="n" />
			</template>
			<ShopCard v-for="shop in shops ?? []" :key="shop.id" :shop="shop" :now="now" />
		</div>
		<p class="note">
			Notre robot s'appelle InStockBot. Il donne son nom à chaque visite, respecte les règles robots.txt qui le visent et ne fait
			qu'une requête à la fois par boutique. <RouterLink :to="{ name: 'robot' }">En savoir plus</RouterLink>
		</p>
	</div>
</template>

<style scoped>
.head {
	display: grid;
	gap: 6px;
	max-width: 70ch;
}
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 12px;
}
.note {
	font-size: 13px;
	color: var(--ink-3);
	border-left: 3px solid var(--tag);
	padding-left: 12px;
	max-width: 70ch;
}
</style>

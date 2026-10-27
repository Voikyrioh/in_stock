<script setup lang="ts">
import type { ShopView } from '@in-stock/shared'
import { onMounted, ref } from 'vue'
import { endpoints } from '../api/endpoints'
import AddByUrlForm from '../components/organisms/AddByUrlForm.vue'
import SearchBar from '../components/organisms/SearchBar.vue'
import { usePageTitle } from '../lib/title'

usePageTitle(() => null)
const shops = ref<ShopView[]>([])
const examples = ['rtx 4070', 'ryzen 7 9800x3d', 'ddr5 32 go 6000']

onMounted(async () => {
	shops.value = (await endpoints.shops().catch(() => ({ shops: [] }))).shops
})
</script>

<template>
	<div class="wrap page">
		<section class="hero">
			<span class="eyebrow">{{ shops.length || 14 }} boutiques lues en direct</span>
			<h1>Où est-il en stock, et à quel prix ?</h1>
			<p class="lead">
				Une recherche interroge LDLC, Materiel.net, Top Achat, Amazon et les autres en même temps. Suivez un produit, In Stock relève
				ses prix toutes les 30 minutes.
			</p>
			<SearchBar large />
			<div class="examples">
				<span class="muted">Exemples :</span>
				<RouterLink v-for="q in examples" :key="q" class="chip" :to="{ name: 'search', query: { q } }">{{ q }}</RouterLink>
			</div>
		</section>
		<div class="grid">
			<section class="panel" aria-labelledby="add-title">
				<h3 id="add-title">Vous avez déjà le lien ?</h3>
				<AddByUrlForm />
			</section>
			<section class="panel" aria-labelledby="shops-title">
				<h3 id="shops-title">Boutiques couvertes</h3>
				<div class="shop-strip">
					<span v-for="shop in shops" :key="shop.id">{{ shop.name }}</span>
				</div>
				<RouterLink :to="{ name: 'shops' }">Voir l'état des boutiques</RouterLink>
			</section>
		</div>
	</div>
</template>

<style scoped>
.hero {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 20px;
	padding-block: 24px 8px;
	max-width: 760px;
}
.lead {
	font-size: 18px;
	color: var(--ink-2);
	max-width: 60ch;
}
.examples {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	font-size: 14px;
}
.chip {
	font: 500 13px/1 var(--font-data);
	padding: 7px 10px;
	border-radius: 999px;
	background: var(--surface-2);
	color: var(--ink-2);
	text-decoration: none;
}
.chip:hover {
	background: var(--accent-soft);
	color: var(--ink);
}
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 16px;
	margin-top: 20px;
}
.shop-strip {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 14px;
	font: 500 13px/1.4 var(--font-data);
	color: var(--ink-2);
}
</style>

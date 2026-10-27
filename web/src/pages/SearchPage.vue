<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '../components/atoms/AppButton.vue'
import ProgressBar from '../components/atoms/ProgressBar.vue'
import SkeletonBlock from '../components/atoms/SkeletonBlock.vue'
import OfferRow from '../components/molecules/OfferRow.vue'
import SearchBar from '../components/organisms/SearchBar.vue'
import SearchReport from '../components/organisms/SearchReport.vue'
import { MESSAGES } from '../lib/copy'
import { clockTime } from '../lib/format'
import { type OfferSort, onlyAvailable, sortOffers } from '../lib/sort'
import { usePageTitle } from '../lib/title'
import { useSearch } from '../stores/search'

const route = useRoute()
const search = useSearch()
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const inStockOnly = ref(readFilter())
const sort = ref<OfferSort>('availability')

usePageTitle(() => (query.value ? `Résultats pour « ${query.value} »` : 'Recherche'))

function readFilter(): boolean {
	try {
		return sessionStorage.getItem('instock.onlyAvailable') === '1'
	} catch {
		return false
	}
}

watch(inStockOnly, (value) => {
	try {
		sessionStorage.setItem('instock.onlyAvailable', value ? '1' : '0')
	} catch {
		// Private mode: the filter is simply not remembered.
	}
})

watch(
	query,
	(q) => {
		if (q) void search.start(q)
	},
	{ immediate: true },
)
onBeforeUnmount(() => search.stop())

const shops = computed(() => search.view?.shops ?? [])
const answered = computed(() => shops.value.filter((s) => s.status !== 'pending').length)
const rows = computed(() => {
	const flat = (search.view?.results ?? []).flatMap((group) =>
		group.offers.map((offer) => ({ ...offer, product: group.product })),
	)
	return sortOffers(inStockOnly.value ? onlyAvailable(flat) : flat, sort.value)
})
const total = computed(() => (search.view?.results ?? []).reduce((n, g) => n + g.offers.length, 0))
const withOffers = computed(() => shops.value.filter((s) => s.offerCount > 0).length)
const cachedAt = computed(() => shops.value.find((s) => s.status === 'cached')?.fetchedAt ?? null)
const done = computed(() => search.view?.done === true)
</script>

<template>
	<div class="wrap page">
		<SearchBar :initial="query" />
		<header class="head">
			<h2>Résultats pour « {{ query }} »</h2>
			<div v-if="search.view" class="progress" aria-live="polite">
				<ProgressBar :value="answered" :max="shops.length" label="Boutiques interrogées" />
				<span class="muted">
					<template v-if="!done">{{ answered }} boutiques sur {{ shops.length }} ont répondu</template>
					<template v-else>Recherche terminée : {{ total }} offres dans {{ withOffers }} boutiques</template>
					<template v-if="cachedAt"> · Relevé à {{ clockTime(cachedAt) }}</template>
				</span>
			</div>
			<div class="toolbar">
				<label class="check"><input id="only-stock" v-model="inStockOnly" type="checkbox" /> En stock uniquement</label>
				<label class="sort">
					Trier par
					<select id="sort" v-model="sort">
						<option value="availability">Disponibilité puis prix</option>
						<option value="price-asc">Prix croissant</option>
						<option value="price-desc">Prix décroissant</option>
					</select>
				</label>
			</div>
		</header>

		<div v-if="search.error && !search.view" class="panel">
			<p role="alert">{{ search.error }}</p>
			<div><AppButton variant="ghost" @click="search.start(query)">Réessayer</AppButton></div>
		</div>

		<div v-else class="layout">
			<div class="offers">
				<OfferRow v-for="row in rows" :key="row.id" :offer="row" :product="row.product" />
				<template v-if="!done">
					<SkeletonBlock />
					<SkeletonBlock />
				</template>
				<div v-else-if="rows.length === 0" class="panel empty">
					<p v-if="total === 0">{{ MESSAGES.noOffer(query) }}</p>
					<p v-else>Aucune offre en stock pour le moment. Décochez « En stock uniquement » pour voir les autres.</p>
					<RouterLink v-if="total === 0" :to="{ name: 'home', hash: '#add-title' }">Ajouter un produit par son lien</RouterLink>
				</div>
				<p v-if="search.error && search.view" class="muted" role="alert">{{ search.error }}</p>
			</div>
			<SearchReport v-if="shops.length" :shops="shops" />
		</div>
	</div>
</template>

<style scoped>
.head {
	display: grid;
	gap: 14px;
}
.progress {
	display: grid;
	gap: 8px;
}
.toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: 10px 20px;
	align-items: center;
	justify-content: space-between;
	border-block: 1px solid var(--line);
	padding-block: 10px;
}
.check,
.sort {
	display: inline-flex;
	gap: 8px;
	align-items: center;
	font-weight: 600;
	font-size: 14px;
}
select {
	font: 500 14px/1 var(--font-body);
	padding: 7px 10px;
	border-radius: var(--r-s);
	border: 1px solid var(--line);
	background: var(--surface);
}
.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 280px;
	gap: 24px;
	align-items: start;
}
.offers {
	display: grid;
	gap: 10px;
	min-width: 0;
}
.empty {
	gap: 8px;
}
@media (max-width: 860px) {
	.layout {
		grid-template-columns: 1fr;
	}
}
</style>

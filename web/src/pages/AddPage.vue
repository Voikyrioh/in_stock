<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AddByUrlForm from '../components/organisms/AddByUrlForm.vue'
import { usePageTitle } from '../lib/title'

const route = useRoute()
const url = computed(() => (typeof route.query.url === 'string' ? route.query.url : ''))
usePageTitle(() => 'Ajouter un produit')
</script>

<template>
	<div class="wrap page narrow">
		<h2>Ajouter un produit par son lien</h2>
		<section class="panel">
			<AddByUrlForm :key="url" :initial="url" :auto-submit="Boolean(url)" />
		</section>
	</div>
</template>

<style scoped>
.narrow {
	max-width: 760px;
}
</style>

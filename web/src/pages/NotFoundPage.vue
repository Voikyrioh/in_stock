<script setup lang="ts">
import { usePageTitle } from '../lib/title'

usePageTitle(() => 'Page introuvable')
</script>

<template>
	<div class="wrap page">
		<section class="panel missing">
			<h2>Page introuvable</h2>
			<p class="muted">Cette adresse ne correspond à aucune page.</p>
			<RouterLink :to="{ name: 'home' }">Revenir à l'accueil</RouterLink>
		</section>
	</div>
</template>

<style scoped>
.missing {
	max-width: 520px;
}
</style>

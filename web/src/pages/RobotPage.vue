<script setup lang="ts">
import { usePageTitle } from '../lib/title'

usePageTitle(() => 'Notre robot')
</script>

<template>
	<div class="wrap page">
		<article class="text">
			<h2>Notre robot</h2>
			<p>
				In Stock lit les pages publiques des boutiques en ligne pour relever le prix et la disponibilité des produits que ses
				utilisateurs cherchent ou suivent. Notre robot s'appelle <strong>InStockBot</strong>.
			</p>
			<h3>Comment il se présente</h3>
			<p>
				Chaque visite porte l'en-tête <code>User-Agent: Mozilla/5.0 (compatible; InStockBot/1.0; +https://in-stock.voikyrioh.fr/robot)</code>.
			</p>
			<h3>Les règles qu'il respecte</h3>
			<ul>
				<li>Il lit le fichier <code>robots.txt</code> de chaque site et ne visite jamais une page qu'il interdit.</li>
				<li>Il ne fait qu'une requête à la fois par boutique, avec au moins deux secondes entre deux requêtes.</li>
				<li>Quand une boutique demande de ralentir (codes 429 ou 503), il s'arrête plusieurs minutes.</li>
				<li>Il ne contourne aucune protection : pas de résolution de CAPTCHA, pas de connexion à un compte, pas de proxy.</li>
				<li>Les résultats d'une recherche sont réutilisés 15 minutes, un produit suivi est relu au plus toutes les 30 minutes.</li>
			</ul>
			<h3>Vous gérez une boutique ?</h3>
			<p>
				Pour limiter ou interdire le passage d'InStockBot, ajoutez une règle à votre <code>robots.txt</code>, par exemple
				<code>User-agent: InStockBot</code> puis <code>Disallow: /</code>. Elle est prise en compte sous 12 heures.
			</p>
		</article>
	</div>
</template>

<style scoped>
.text {
	display: grid;
	gap: 14px;
	max-width: 68ch;
}
.text h3 {
	margin-top: 8px;
}
ul {
	margin: 0;
	padding-left: 20px;
	display: grid;
	gap: 6px;
}
code {
	font: 500 13px/1.4 var(--font-data);
	background: var(--surface-2);
	padding: 1px 5px;
	border-radius: 4px;
	overflow-wrap: anywhere;
}
</style>

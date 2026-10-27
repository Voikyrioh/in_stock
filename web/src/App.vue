<script setup lang="ts">
import SiteFooter from './components/organisms/SiteFooter.vue'
import SiteHeader from './components/organisms/SiteHeader.vue'
import ToastHost from './components/organisms/ToastHost.vue'
</script>

<template>
	<a class="skip" href="#main">Aller au contenu</a>
	<SiteHeader />
	<main id="main" tabindex="-1">
		<RouterView />
	</main>
	<SiteFooter />
	<ToastHost />
</template>

<style>
#app {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}
#main {
	flex: 1;
	outline: none;
}
.skip {
	position: absolute;
	left: 8px;
	top: -48px;
	background: var(--surface);
	color: var(--ink);
	padding: 8px 12px;
	border-radius: var(--r-s);
	z-index: 30;
}
.skip:focus {
	top: 8px;
}
</style>

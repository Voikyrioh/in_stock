<script setup lang="ts">
import { useRouter } from 'vue-router'
import { MESSAGES } from '../../lib/copy'
import { useFollows } from '../../stores/follows'
import { useSession } from '../../stores/session'
import { useToasts } from '../../stores/toasts'
import AppButton from '../atoms/AppButton.vue'

const session = useSession()
const follows = useFollows()
const toasts = useToasts()
const router = useRouter()

async function logout() {
	await session.logout().catch(() => session.forget())
	follows.reset()
	toasts.show(MESSAGES.loggedOut, 'success')
	await router.push({ name: 'home' })
}
</script>

<template>
	<header class="site-head">
		<div class="wrap inner">
			<RouterLink class="logo" :to="{ name: 'home' }" aria-label="In Stock, accueil">
				<span class="mark" aria-hidden="true">IS</span>In Stock
			</RouterLink>
			<nav class="nav" aria-label="Navigation principale">
				<RouterLink :to="{ name: 'shops' }">Boutiques</RouterLink>
				<RouterLink :to="{ name: 'follows' }">Mes suivis</RouterLink>
				<template v-if="session.signedIn">
					<RouterLink :to="{ name: 'account' }">Mon compte</RouterLink>
					<AppButton variant="ghost" size="s" @click="logout">Se déconnecter</AppButton>
				</template>
				<AppButton v-else size="s" :to="{ name: 'login' }">Se connecter</AppButton>
			</nav>
		</div>
	</header>
</template>

<style scoped>
.site-head {
	background: var(--surface);
	border-bottom: 1px solid var(--line);
}
.inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 12px 16px;
	padding-block: 14px;
}
.logo {
	display: flex;
	align-items: center;
	gap: 10px;
	font: 800 22px/1 var(--font-display);
	letter-spacing: -0.02em;
	color: var(--ink);
	text-decoration: none;
}
.mark {
	display: inline-grid;
	place-items: center;
	width: 30px;
	height: 30px;
	border-radius: 7px;
	background: var(--tag);
	color: var(--tag-ink);
	font: 700 13px/1 var(--font-data);
}
.nav {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 18px;
	align-items: center;
	font-weight: 600;
	font-size: 14px;
}
.nav > a:not(.btn) {
	color: var(--ink-2);
	text-decoration: none;
}
.nav > a:not(.btn):hover,
.nav > a.router-link-active:not(.btn) {
	color: var(--ink);
	text-decoration: underline;
}
</style>

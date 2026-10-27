<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '../api/http'
import AppButton from '../components/atoms/AppButton.vue'
import FormField from '../components/molecules/FormField.vue'
import { afterSignIn } from '../lib/auth-redirect'
import { MESSAGES } from '../lib/copy'
import { usePageTitle } from '../lib/title'
import { useSession } from '../stores/session'

usePageTitle(() => 'Se connecter')
const session = useSession()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const errors = ref<{ email?: string; password?: string }>({})
const alert = ref<string | null>(route.query.expired ? MESSAGES.sessionExpired : null)
const busy = ref(false)

async function submit() {
	errors.value = {}
	if (!email.value.trim()) errors.value.email = MESSAGES.emailRequired
	if (!password.value) errors.value.password = MESSAGES.passwordRequired
	if (errors.value.email || errors.value.password) return
	busy.value = true
	alert.value = null
	try {
		await session.login(email.value, password.value)
		await afterSignIn(router, route.query)
	} catch (error) {
		alert.value = errorMessage(error)
	} finally {
		busy.value = false
	}
}
</script>

<template>
	<div class="wrap page">
		<form class="panel auth" novalidate @submit.prevent="submit">
			<h2>Se connecter</h2>
			<div v-if="alert" class="alert" role="alert">{{ alert }}</div>
			<FormField id="login-email" v-model="email" type="email" label="Email" autocomplete="email" :error="errors.email" />
			<FormField
				id="login-password"
				v-model="password"
				type="password"
				label="Mot de passe"
				autocomplete="current-password"
				:error="errors.password"
			/>
			<AppButton type="submit" block :disabled="busy">{{ busy ? 'Connexion…' : 'Se connecter' }}</AppButton>
			<span class="muted">
				Pas encore de compte ?
				<RouterLink :to="{ name: 'register', query: route.query }">Créer un compte</RouterLink>
			</span>
			<span class="note muted">Mot de passe oublié : la récupération par email arrive bientôt.</span>
		</form>
	</div>
</template>

<style scoped>
.auth {
	max-width: 420px;
	width: 100%;
	margin: 24px auto 0;
	padding: 28px;
	gap: 16px;
}
.alert {
	border-radius: var(--r-s);
	padding: 10px 12px;
	font-size: 14px;
	font-weight: 600;
	background: var(--out-soft);
	color: var(--out);
}
.note {
	font-size: 13px;
}
</style>

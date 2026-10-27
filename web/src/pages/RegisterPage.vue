<script setup lang="ts">
import { LIMITS } from '@in-stock/shared'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, errorMessage } from '../api/http'
import AppButton from '../components/atoms/AppButton.vue'
import FormField from '../components/molecules/FormField.vue'
import { afterSignIn } from '../lib/auth-redirect'
import { MESSAGES } from '../lib/copy'
import { usePageTitle } from '../lib/title'
import { useSession } from '../stores/session'

usePageTitle(() => 'Créer un compte')
const session = useSession()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const errors = ref<{ email?: string; password?: string }>({})
const alert = ref<string | null>(null)
const busy = ref(false)

function validate(): boolean {
	errors.value = {}
	const value = email.value.trim()
	if (!value) errors.value.email = MESSAGES.emailRequired
	else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) errors.value.email = MESSAGES.emailInvalid
	if (password.value.length < LIMITS.passwordMin) errors.value.password = MESSAGES.passwordShort
	else if (password.value.length > LIMITS.passwordMax) errors.value.password = MESSAGES.passwordLong
	return !errors.value.email && !errors.value.password
}

async function submit() {
	if (!validate()) return
	busy.value = true
	alert.value = null
	try {
		await session.register(email.value, password.value)
		await afterSignIn(router, route.query)
	} catch (error) {
		if (
			error instanceof ApiError &&
			error.code === 'invalid-payload' &&
			Array.isArray(error.details)
		) {
			const field = error.details[0]?.field
			if (field === 'password') errors.value.password = MESSAGES.passwordShort
			else errors.value.email = MESSAGES.emailInvalid
		} else alert.value = errorMessage(error)
	} finally {
		busy.value = false
	}
}
</script>

<template>
	<div class="wrap page">
		<form class="panel auth" novalidate @submit.prevent="submit">
			<div class="title">
				<h2>Créer un compte</h2>
				<p class="muted">Pour suivre vos produits depuis n'importe quel appareil.</p>
			</div>
			<div v-if="alert" class="alert" role="alert">{{ alert }}</div>
			<FormField
				id="register-email"
				v-model="email"
				type="email"
				label="Email"
				autocomplete="email"
				:maxlength="LIMITS.emailMax"
				:error="errors.email"
			/>
			<FormField
				id="register-password"
				v-model="password"
				type="password"
				label="Mot de passe"
				autocomplete="new-password"
				help="10 caractères minimum. Une phrase facile à retenir fait l'affaire."
				:maxlength="LIMITS.passwordMax"
				:error="errors.password"
			/>
			<AppButton type="submit" block :disabled="busy">{{ busy ? 'Création…' : 'Créer mon compte' }}</AppButton>
			<span class="muted">
				Déjà un compte ?
				<RouterLink :to="{ name: 'login', query: route.query }">Se connecter</RouterLink>
			</span>
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
.title {
	display: grid;
	gap: 4px;
}
.alert {
	border-radius: var(--r-s);
	padding: 10px 12px;
	font-size: 14px;
	font-weight: 600;
	background: var(--out-soft);
	color: var(--out);
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { errorMessage } from '../api/http'
import AppButton from '../components/atoms/AppButton.vue'
import ConfirmDialog from '../components/molecules/ConfirmDialog.vue'
import FormField from '../components/molecules/FormField.vue'
import { MESSAGES } from '../lib/copy'
import { longDate } from '../lib/format'
import { usePageTitle } from '../lib/title'
import { useFollows } from '../stores/follows'
import { useSession } from '../stores/session'
import { useToasts } from '../stores/toasts'

usePageTitle(() => 'Mon compte')
const session = useSession()
const follows = useFollows()
const toasts = useToasts()
const router = useRouter()
const confirming = ref(false)
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

async function logout() {
	await session.logout().catch(() => session.forget())
	follows.reset()
	toasts.show(MESSAGES.loggedOut, 'success')
	await router.push({ name: 'home' })
}

async function remove() {
	if (!password.value) {
		error.value = MESSAGES.passwordRequired
		return
	}
	busy.value = true
	error.value = null
	try {
		await session.deleteAccount(password.value)
		follows.reset()
		confirming.value = false
		toasts.show(MESSAGES.accountDeleted, 'success')
		await router.push({ name: 'home' })
	} catch (e) {
		error.value = errorMessage(e)
	} finally {
		busy.value = false
	}
}
</script>

<template>
	<div v-if="session.user" class="wrap page narrow">
		<h2>Mon compte</h2>
		<section class="panel">
			<p>Connecté avec <strong>{{ session.user.email }}</strong></p>
			<p class="muted">Membre depuis le {{ longDate(session.user.createdAt) }}</p>
			<div><AppButton variant="ghost" @click="logout">Se déconnecter</AppButton></div>
		</section>
		<section class="panel danger-zone">
			<h3>Supprimer mon compte</h3>
			<p class="muted">Vos suivis seront effacés. Cette action est définitive.</p>
			<div><AppButton variant="danger" @click="confirming = true">Supprimer mon compte</AppButton></div>
		</section>
		<ConfirmDialog :open="confirming" title="Supprimer mon compte" @close="confirming = false">
			<p class="muted">Vos suivis seront effacés. Cette action est définitive.</p>
			<form class="confirm" novalidate @submit.prevent="remove">
				<FormField
					id="delete-password"
					v-model="password"
					type="password"
					label="Mot de passe actuel"
					autocomplete="current-password"
					:error="error"
				/>
				<div class="buttons">
					<AppButton variant="ghost" @click="confirming = false">Annuler</AppButton>
					<AppButton type="submit" variant="danger" :disabled="busy">Supprimer définitivement</AppButton>
				</div>
			</form>
		</ConfirmDialog>
	</div>
</template>

<style scoped>
.narrow {
	max-width: 720px;
}
.danger-zone {
	border-color: var(--out);
}
.confirm {
	display: grid;
	gap: 14px;
}
.buttons {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}
</style>

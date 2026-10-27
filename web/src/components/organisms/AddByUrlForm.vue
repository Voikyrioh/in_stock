<script setup lang="ts">
import { LIMITS } from '@in-stock/shared'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { endpoints } from '../../api/endpoints'
import { errorMessage } from '../../api/http'
import { MESSAGES } from '../../lib/copy'
import AppButton from '../atoms/AppButton.vue'
import FormField from '../molecules/FormField.vue'

const props = withDefaults(defineProps<{ initial?: string; autoSubmit?: boolean }>(), {
	initial: '',
	autoSubmit: false,
})
const router = useRouter()
const url = ref(props.initial)
const error = ref<string | null>(null)
const busy = ref(false)

async function submit() {
	const value = url.value.trim()
	if (!/^https?:\/\/\S+\.\S+/i.test(value)) {
		error.value = MESSAGES.urlFormat
		return
	}
	busy.value = true
	error.value = null
	try {
		const { productId } = await endpoints.addFromUrl(value)
		await router.push({ name: 'product', params: { id: productId } })
	} catch (e) {
		error.value = errorMessage(e)
	} finally {
		busy.value = false
	}
}

onMounted(() => {
	if (props.autoSubmit && url.value) void submit()
})
</script>

<template>
	<form class="add" novalidate @submit.prevent="submit">
		<div class="row">
			<FormField
				id="add-url"
				v-model="url"
				class="grow"
				type="url"
				label="Coller un lien"
				placeholder="https://www.boutique.fr/fiche-produit"
				help="Collez le lien d'une fiche produit, même d'une boutique absente de notre liste."
				:maxlength="LIMITS.urlMax"
				:error="error"
			/>
			<AppButton type="submit" class="submit" :disabled="busy">{{ busy ? 'Lecture de la page…' : 'Ajouter' }}</AppButton>
		</div>
	</form>
</template>

<style scoped>
.row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: flex-start;
}
.grow {
	flex: 1 1 260px;
}
.submit {
	margin-top: 27px;
}
</style>

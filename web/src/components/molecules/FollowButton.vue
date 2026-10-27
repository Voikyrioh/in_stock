<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '../../api/http'
import { MESSAGES } from '../../lib/copy'
import { useFollows } from '../../stores/follows'
import { useSession } from '../../stores/session'
import { useToasts } from '../../stores/toasts'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ productId: string; productName: string; followed: boolean }>()
const emit = defineEmits<{ change: [followed: boolean] }>()

const session = useSession()
const follows = useFollows()
const toasts = useToasts()
const router = useRouter()
const route = useRoute()
const busy = ref(false)
const hover = ref(false)

async function toggle() {
	if (!session.signedIn) {
		toasts.show(MESSAGES.loginToFollow, 'info')
		await router.push({
			name: 'login',
			query: { redirect: route.fullPath, follow: props.productId },
		})
		return
	}
	busy.value = true
	try {
		if (props.followed) {
			await follows.unfollow(props.productId)
			toasts.show(MESSAGES.unfollowed(props.productName), 'info')
			emit('change', false)
		} else {
			await follows.follow(props.productId)
			toasts.show(MESSAGES.followed, 'success')
			emit('change', true)
		}
	} catch (error) {
		toasts.show(errorMessage(error), 'error')
	} finally {
		busy.value = false
	}
}
</script>

<template>
	<AppButton
		:variant="props.followed ? 'ghost' : 'primary'"
		:disabled="busy"
		:aria-pressed="props.followed"
		@click="toggle"
		@mouseenter="hover = true"
		@mouseleave="hover = false"
		@focus="hover = true"
		@blur="hover = false"
	>
		{{ props.followed ? (hover ? 'Ne plus suivre' : 'Suivi') : 'Suivre' }}
	</AppButton>
</template>

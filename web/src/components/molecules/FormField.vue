<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../atoms/AppIcon.vue'

const props = withDefaults(
	defineProps<{
		id: string
		label: string
		type?: 'text' | 'email' | 'password' | 'url' | 'search'
		autocomplete?: string
		placeholder?: string
		help?: string
		error?: string | null
		maxlength?: number
	}>(),
	{
		type: 'text',
		autocomplete: 'off',
		placeholder: undefined,
		help: undefined,
		error: null,
		maxlength: undefined,
	},
)
const model = defineModel<string>({ required: true })
const revealed = ref(false)
const inputType = computed(() =>
	props.type === 'password' && revealed.value ? 'text' : props.type,
)
const describedBy = computed(
	() =>
		[props.error ? `${props.id}-error` : null, props.help ? `${props.id}-help` : null]
			.filter(Boolean)
			.join(' ') || undefined,
)
</script>

<template>
	<div class="field">
		<label :for="props.id">{{ props.label }}</label>
		<div class="control" :class="{ invalid: props.error }">
			<input
				:id="props.id"
				v-model="model"
				:type="inputType"
				:autocomplete="props.autocomplete"
				:placeholder="props.placeholder"
				:maxlength="props.maxlength"
				:aria-invalid="props.error ? 'true' : undefined"
				:aria-describedby="describedBy"
			/>
			<button
				v-if="props.type === 'password'"
				type="button"
				class="reveal"
				:aria-pressed="revealed"
				@click="revealed = !revealed"
			>
				<AppIcon name="eye" />
				{{ revealed ? 'Masquer' : 'Afficher' }}
			</button>
		</div>
		<span v-if="props.error" :id="`${props.id}-error`" class="error">{{ props.error }}</span>
		<span v-if="props.help" :id="`${props.id}-help`" class="help">{{ props.help }}</span>
	</div>
</template>

<style scoped>
.field {
	display: grid;
	gap: 6px;
	min-width: 0;
}
label {
	font-weight: 600;
	font-size: 14px;
}
.control {
	display: flex;
	align-items: center;
	border: 1px solid var(--line);
	background: var(--paper);
	border-radius: var(--r-s);
}
.control:focus-within {
	outline: var(--focus);
	outline-offset: 1px;
}
.control.invalid {
	border-color: var(--out);
}
input {
	flex: 1;
	/* width 0 + flex 1: the field fills the row but never forces it wider (phones). */
	width: 0;
	min-width: 0;
	border: 0;
	background: transparent;
	padding: 10px 12px;
	font-size: 15px;
}
input:focus {
	outline: none;
}
.reveal {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	border: 0;
	background: transparent;
	color: var(--ink-2);
	font-size: 13px;
	font-weight: 600;
	padding: 8px 10px;
	cursor: pointer;
}
.error {
	font-size: 13px;
	font-weight: 600;
	color: var(--out);
}
.help {
	font-size: 13px;
	color: var(--ink-3);
}
</style>

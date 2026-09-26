<template>
  <v-snackbar :model-value="Boolean(message)" class="manager-snackbar" location="top right" :color="message?.type ?? 'info'" timeout="4200" @update:model-value="onVisible">
    <span class="manager-snackbar-content"><v-icon :icon="icon" class="mr-2" aria-hidden="true" />{{ message?.text }}</span>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
export type SnackbarMessage = { type: 'success' | 'error' | 'warning' | 'info'; text: string } | null
const props = defineProps<{ message: SnackbarMessage }>()
const emit = defineEmits<{ clear: [] }>()
const icon = computed(() => props.message?.type === 'success' ? 'mdi-check-circle' : props.message?.type === 'warning' ? 'mdi-alert-circle' : props.message?.type === 'error' ? 'mdi-alert' : 'mdi-information')
function onVisible(visible: boolean) { if (!visible) emit('clear') }
</script>

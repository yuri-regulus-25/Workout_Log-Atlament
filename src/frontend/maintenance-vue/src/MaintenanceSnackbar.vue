<template>
  <v-snackbar
    :model-value="Boolean(message)"
    class="maintenance-snackbar"
    location="top right"
    :color="snackbarColor"
    timeout="4200"
    @update:model-value="onVisibleChange"
  >
    <span class="maintenance-snackbar-content">
      <v-icon :icon="snackbarIcon" class="mr-2" aria-hidden="true" />
      <span>{{ message?.text }}</span>
    </span>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SnackbarMessage = { type: 'success' | 'error' | 'warning' | 'info'; text: string } | null

const props = defineProps<{
  message: SnackbarMessage
}>()

const emit = defineEmits<{
  clear: []
}>()

const snackbarIcon = computed(() => {
  if (props.message?.type === 'error') return 'mdi-alert'
  if (props.message?.type === 'warning') return 'mdi-alert-circle'
  if (props.message?.type === 'info') return 'mdi-information'
  return 'mdi-check-circle'
})

const snackbarColor = computed(() => {
  if (props.message?.type === 'error') return 'error'
  if (props.message?.type === 'warning') return 'warning'
  if (props.message?.type === 'info') return 'info'
  return 'success'
})

function onVisibleChange(visible: boolean) {
  if (!visible) emit('clear')
}
</script>

<template>
  <v-snackbar
    :model-value="Boolean(message)"
    class="maintenance-snackbar"
    location="top right"
    :color="message?.type ?? 'success'"
    timeout="4200"
    @update:model-value="onVisibleChange"
  >
    {{ message?.text }}
    <template #actions>
      <v-btn variant="text" aria-label="閉じる" @click="emit('clear')">閉じる</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
type SnackbarMessage = { type: 'success' | 'error' | 'warning' | 'info'; text: string } | null

defineProps<{
  message: SnackbarMessage
}>()

const emit = defineEmits<{
  clear: []
}>()

function onVisibleChange(visible: boolean) {
  if (!visible) emit('clear')
}
</script>

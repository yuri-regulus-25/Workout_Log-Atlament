<template>
  <v-dialog
    :model-value="open"
    :max-width="maxWidth"
    :persistent="persistent"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card class="maintenance-dialog-card">
      <v-toolbar class="maintenance-dialog-toolbar" density="comfortable" style="background: var(--wl-primary); background-color: var(--wl-primary); color: #ffffff;">
        <v-btn icon="mdi-close" variant="text" aria-label="閉じる" :disabled="busy" @click="emit('close')" />
        <v-toolbar-title>{{ title }}</v-toolbar-title>
        <v-divider vertical class="mx-0" />
        <v-btn v-if="primaryLabel" variant="text" :disabled="primaryDisabled || busy" @click="emit('primary')">
          {{ primaryLabel }}
        </v-btn>
      </v-toolbar>
      <v-card-text class="maintenance-dialog-body">
        <slot />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  primaryLabel?: string
  primaryDisabled?: boolean
  busy?: boolean
  persistent?: boolean
  maxWidth?: number | string
}>(), {
  primaryLabel: '',
  primaryDisabled: false,
  busy: false,
  persistent: false,
  maxWidth: 720,
})

const emit = defineEmits<{
  'update:open': [open: boolean]
  close: []
  primary: []
}>()
</script>

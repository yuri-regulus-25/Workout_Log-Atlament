<template>
  <v-dialog :model-value="open" max-width="460" :persistent="busy" @update:model-value="emit('update:open', $event)">
    <v-card class="manager-dialog-card">
      <v-toolbar class="manager-dialog-toolbar" density="comfortable">
        <v-btn icon="mdi-close" variant="text" aria-label="閉じる" :disabled="busy" @click="emit('close')" />
        <v-toolbar-title>{{ title }}</v-toolbar-title>
        <v-divider vertical />
        <v-btn variant="text" :disabled="busy" @click="emit('primary')">{{ primaryLabel }}</v-btn>
      </v-toolbar>
      <v-card-text class="manager-dialog-body"><slot /></v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title: string; primaryLabel: string; busy?: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; close: []; primary: [] }>()
</script>

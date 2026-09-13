<template>
  <v-overlay :model-value="active" class="manager-loading-overlay" persistent contained scrim="var(--wl-overlay)" :z-index="2600">
    <div class="manager-loading-card" role="status" aria-live="polite">
      <v-progress-circular indeterminate color="var(--wl-primary)" size="44" width="4" />
      <span>{{ label }}</span>
    </div>
  </v-overlay>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ active: boolean; label?: string }>(), { label: '処理しています' })
</script>

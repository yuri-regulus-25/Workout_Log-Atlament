<template>
  <v-overlay
    :model-value="active"
    class="maintenance-loading-overlay"
    persistent
    scrim="var(--wl-overlay)"
    :z-index="2600"
  >
    <div class="maintenance-loading-card" role="status" aria-live="polite">
      <v-progress-circular indeterminate color="primary" size="44" width="4" />
      <span>{{ label }}</span>
    </div>
  </v-overlay>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  active: boolean
  label?: string
}>(), {
  label: '処理しています',
})
</script>

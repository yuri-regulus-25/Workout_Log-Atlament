<template>
  <div class="confirmation-row">
    <p>{{ label }}</p>
    <p class="confirmation-value">{{ value }}<template v-if="suffix"> {{ suffix }}</template></p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; suffix?: string }>()
</script>

<style scoped>
.confirmation-value {
  white-space: pre-wrap;
}
</style>

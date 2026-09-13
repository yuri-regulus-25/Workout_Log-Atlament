<template>
  <div class="confirmation-row">
    <p>{{ label }}</p>
    <p>{{ value }}<template v-if="suffix"> {{ suffix }}</template></p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; suffix?: string }>()
</script>

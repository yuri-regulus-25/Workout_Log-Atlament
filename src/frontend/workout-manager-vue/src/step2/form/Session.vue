<template>
  <v-select
    :model-value="modelValue"
    :items="items"
    item-title="title"
    item-value="value"
    label="編集するセッション"
    density="compact"
    variant="outlined"
    hide-details
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
defineProps<{ modelValue: string; items: Array<{ title: string; value: string }> }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

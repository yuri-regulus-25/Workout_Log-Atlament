<template>
  <v-textarea
    :model-value="modelValue"
    label="Notes"
    rows="2"
    auto-grow
    counter="400"
    density="compact"
    :error-messages="errors"
    @update:model-value="emit('update:modelValue', $event || null)"
  />
</template>

<script setup lang="ts">
defineProps<{ modelValue: string | null; errors: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
</script>

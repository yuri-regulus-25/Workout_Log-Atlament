<template>
  <v-text-field
    :model-value="modelValue"
    label="Weight"
    suffix="kg"
    type="number"
    min="0"
    max="999.99"
    step="0.01"
    density="compact"
    variant="outlined"
    :error-messages="errors"
    @update:model-value="onUpdate"
  />
</template>

<script setup lang="ts">
defineProps<{ modelValue: number | null; errors: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()
function onUpdate(value: string) { emit('update:modelValue', value === '' ? null : Number(value)) }
</script>

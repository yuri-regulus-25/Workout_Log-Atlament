<template>
  <v-text-field
    :model-value="modelValue"
    label="Reps"
    suffix="reps"
    type="number"
    min="1"
    max="100"
    step="1"
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

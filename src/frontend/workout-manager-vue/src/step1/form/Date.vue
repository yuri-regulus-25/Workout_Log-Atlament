<template>
  <div class="date-field">
    <strong>ワークアウト日</strong>
    <v-date-picker
      :model-value="modelValue"
      :max="maximum"
      :events="markers"
      event-color="primary"
      hide-header
      show-adjacent-months
      @update:model-value="onUpdate"
    />
    <output v-if="modelValue" class="selected-date">{{ modelValue.replaceAll('-', '/') }}</output>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string | null; maximum: string; markers: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
function onUpdate(value: unknown) {
  if (typeof value === 'string') emit('update:modelValue', value.slice(0, 10))
  else if (value instanceof Date) emit('update:modelValue', localIso(value))
  else emit('update:modelValue', null)
}
function localIso(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

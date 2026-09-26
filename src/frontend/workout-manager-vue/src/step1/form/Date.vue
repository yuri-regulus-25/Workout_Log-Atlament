<template>
  <div class="date-field">
    <v-menu v-model="menuOpen" :close-on-content-click="false">
      <template #activator="{ props: activatorProps }">
        <v-text-field
          v-bind="activatorProps"
          class="workout-date-field"
          :model-value="displayValue"
          label="対象日"
          prepend-icon="mdi-calendar"
          density="compact"
          variant="outlined"
          readonly
          hide-details
        />
      </template>
      <v-date-picker
        class="workout-date-picker"
        :model-value="modelValue"
        :max="maximum"
        locale="ja-JP"
        header-color="var(--wl-primary)"
        hide-title
        show-adjacent-months
        @update:model-value="onUpdate"
      />
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ modelValue: string | null; maximum: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
const menuOpen = ref(false)
const displayValue = computed(() => props.modelValue?.replaceAll('-', '/') ?? '')

function onUpdate(value: unknown) {
  if (typeof value === 'string') emit('update:modelValue', value.slice(0, 10))
  else if (value instanceof Date) emit('update:modelValue', localIso(value))
  else emit('update:modelValue', null)
  menuOpen.value = false
}
function localIso(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

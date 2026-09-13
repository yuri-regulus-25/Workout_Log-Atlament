<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="items"
    item-title="name"
    item-value="id"
    label="ジム"
    density="compact"
    no-data-text="マスターデータに存在しません"
    :error-messages="errors"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { WorkoutMasterOption } from '@workout-lab/frontend-common'
defineProps<{ modelValue: string | null; items: WorkoutMasterOption[]; errors: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
</script>

<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="selectItems"
    item-title="name"
    item-value="id"
    item-props="props"
    label="マシン"
    density="compact"
    variant="outlined"
    no-data-text="マスターデータに存在しません"
    :error-messages="errors"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template v-if="item.raw.selected" #prepend><v-chip size="small" color="error" class="mr-2">選択済</v-chip></template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkoutMasterOption } from '@workout-lab/frontend-common'
const props = defineProps<{ modelValue: string | null; items: WorkoutMasterOption[]; selectedIds: string[]; errors: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
const selectItems = computed(() => props.items.map(item => {
  const selected = item.id !== props.modelValue && props.selectedIds.includes(item.id)
  return { ...item, selected, props: { disabled: selected } }
}))
</script>

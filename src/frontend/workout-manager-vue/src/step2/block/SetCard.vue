<template>
  <v-card class="set-card" variant="outlined" density="compact">
    <div class="set-number"><v-icon :icon="numberIcon" aria-hidden="true" /></div>
    <div class="set-fields">
      <div class="numeric-fields">
        <RepsField :model-value="set.reps" :errors="errorsFor('reps')" @update:model-value="emit('update', { ...set, reps: $event })" />
        <WeightField :model-value="set.weightKg" :errors="errorsFor('weightKg')" @update:model-value="emit('update', { ...set, weightKg: $event })" />
      </div>
      <NotesField :model-value="set.notes" :errors="errorsFor('notes')" @update:model-value="emit('update', { ...set, notes: $event })" />
    </div>
    <div class="item-actions">
      <v-btn icon="mdi-plus-thick" size="small" variant="text" aria-label="このセットの直下に追加" :disabled="addDisabled" @click="emit('add')" />
      <v-btn icon="mdi-trash-can" size="small" variant="text" color="error" aria-label="このセットを削除" :disabled="deleteDisabled" @click="emit('delete')" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkoutSetInput } from '@workout-lab/frontend-common'
import NotesField from '../form/Notes.vue'
import RepsField from '../form/Reps.vue'
import WeightField from '../form/Weight.vue'
const props = defineProps<{ set: WorkoutSetInput; number: number; errors: Record<string, string[]>; addDisabled: boolean; deleteDisabled: boolean }>()
const emit = defineEmits<{ update: [value: WorkoutSetInput]; add: []; delete: [] }>()
const numberIcon = computed(() => `mdi-numeric-${props.number}-box-outline`)
function errorsFor(field: string) { return props.errors[field] ?? [] }
</script>

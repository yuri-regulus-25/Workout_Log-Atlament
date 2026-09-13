<template>
  <v-row dense class="set-row">
    <v-col cols="1" class="set-number"><v-icon :icon="numberIcon" aria-hidden="true" /></v-col>
    <v-col cols="10">
      <v-card class="set-card" variant="outlined" density="compact">
        <div class="set-fields">
          <div class="numeric-fields">
            <RepsField :model-value="set.reps" :errors="errorsFor('reps')" @update:model-value="emit('update', { ...set, reps: $event })" />
            <WeightField :model-value="set.weightKg" :errors="errorsFor('weightKg')" @update:model-value="emit('update', { ...set, weightKg: $event })" />
          </div>
          <NotesField :model-value="set.notes" :errors="errorsFor('notes')" @update:model-value="emit('update', { ...set, notes: $event })" />
        </div>
      </v-card>
    </v-col>
    <v-col cols="1" class="item-actions set-actions">
      <v-btn size="small" variant="text" aria-label="このセットの直後に追加" :disabled="addDisabled" @click="emit('add')">
        <v-icon icon="mdi-plus-thick" size="small" />
      </v-btn>
      <v-btn size="small" variant="text" color="red" aria-label="このセットを削除" :disabled="deleteDisabled" @click="emit('delete')">
        <v-icon icon="mdi-trash-can" size="small" />
      </v-btn>
    </v-col>
  </v-row>
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

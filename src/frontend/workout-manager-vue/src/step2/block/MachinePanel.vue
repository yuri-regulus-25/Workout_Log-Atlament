<template>
  <v-expansion-panel :value="index" class="machine-panel">
    <v-expansion-panel-title>
      <template #default>
        <v-icon :icon="stateIcon" :color="stateColor" class="mr-2" aria-hidden="true" />
        <span :class="{ 'machine-title-error': hasErrors }">{{ machineName || '？' }}</span>
      </template>
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <div class="machine-content">
        <div class="machine-form">
          <MachineField
            :model-value="machine.machineId"
            :items="items"
            :selected-ids="selectedIds"
            :errors="errorsFor('machineId')"
            @update:model-value="emit('update', { ...machine, machineId: $event })"
          />
          <v-alert v-for="warning in warnings" :key="warning" type="warning" variant="tonal" density="compact" class="field-warning">
            {{ warning }}
          </v-alert>
          <SetCard
            v-for="(set, setIndex) in machine.sets"
            :key="`${set.sourceIndex ?? 'new'}-${setIndex}`"
            :set="set"
            :number="setIndex + 1"
            :errors="setErrors(setIndex)"
            :add-disabled="machine.sets.length >= 10"
            :delete-disabled="machine.sets.length <= 1"
            @update="updateSet(setIndex, $event)"
            @add="emit('add-set', setIndex)"
            @delete="emit('delete-set', setIndex)"
          />
        </div>
        <div class="item-actions machine-actions">
          <v-btn icon="mdi-plus-thick" size="small" variant="text" aria-label="このマシンの直下に追加" :disabled="addDisabled" @click="emit('add')" />
          <v-btn icon="mdi-trash-can" size="small" variant="text" color="error" aria-label="このマシンを削除" :disabled="deleteDisabled" @click="emit('delete')" />
        </div>
      </div>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkoutMachineInput, WorkoutMasterOption, WorkoutSetInput } from '@workout-lab/frontend-common'
import MachineField from '../form/Machine.vue'
import SetCard from './SetCard.vue'
const props = defineProps<{
  machine: WorkoutMachineInput
  index: number
  items: WorkoutMasterOption[]
  selectedIds: string[]
  errors: Record<string, string[]>
  warnings: string[]
  addDisabled: boolean
  deleteDisabled: boolean
  validated: boolean
}>()
const emit = defineEmits<{
  update: [value: WorkoutMachineInput]
  add: []
  delete: []
  'add-set': [index: number]
  'delete-set': [index: number]
}>()
const machineName = computed(() => props.items.find(item => item.id === props.machine.machineId)?.name ?? props.machine.machineId)
const hasErrors = computed(() => Object.keys(props.errors).length > 0)
const stateIcon = computed(() => !props.validated ? 'mdi-help-circle-outline' : hasErrors.value ? 'mdi-alert' : 'mdi-check-circle')
const stateColor = computed(() => !props.validated ? 'orange' : hasErrors.value ? 'error' : 'success')
function errorsFor(field: string) { return props.errors[field] ?? [] }
function setErrors(index: number) {
  const prefix = `sets[${index}].`
  return Object.fromEntries(Object.entries(props.errors).filter(([path]) => path.startsWith(prefix)).map(([path, value]) => [path.slice(prefix.length), value]))
}
function updateSet(index: number, value: WorkoutSetInput) {
  const sets = props.machine.sets.slice()
  sets[index] = value
  emit('update', { ...props.machine, sets })
}
</script>

<template>
  <div class="machine-row">
    <v-expansion-panels
      :model-value="expanded ? index : null"
      variant="accordion"
      class="machine-panels"
      @update:model-value="emit('update:expanded', $event === index)"
    >
      <v-expansion-panel :value="index" class="machine-panel">
        <v-expansion-panel-title>
          <template #default>
            <div class="machine-panel-title">
              <v-icon :icon="stateIcon" :color="stateColor" aria-hidden="true" />
              <span :class="{ 'machine-title-error': validationFailed }">{{ machineName || '？' }}</span>
            </div>
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
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
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <div class="item-actions machine-actions">
      <v-btn size="small" variant="text" aria-label="このマシンの直後に追加" :disabled="addDisabled" @click="emit('add')">
        <v-icon icon="mdi-plus-thick" size="small" />
      </v-btn>
      <v-btn size="small" variant="text" color="red" aria-label="このマシンを削除" :disabled="deleteDisabled" @click="emit('delete')">
        <v-icon icon="mdi-trash-can" size="small" />
      </v-btn>
    </div>
  </div>
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
  expanded: boolean
  addDisabled: boolean
  deleteDisabled: boolean
  validated: boolean
}>()
const emit = defineEmits<{
  update: [value: WorkoutMachineInput]
  'update:expanded': [value: boolean]
  add: []
  delete: []
  'add-set': [index: number]
  'delete-set': [index: number]
}>()
const machineName = computed(() => props.items.find(item => item.id === props.machine.machineId)?.name ?? props.machine.machineId)
const hasErrors = computed(() => Object.keys(props.errors).length > 0)
const validationFailed = computed(() => props.validated && hasErrors.value)
const stateIcon = computed(() => !props.validated ? 'mdi-help-circle-outline' : validationFailed.value ? 'mdi-alert' : 'mdi-check-circle')
const stateColor = computed(() => !props.validated ? 'orange' : validationFailed.value ? 'red' : 'green')
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

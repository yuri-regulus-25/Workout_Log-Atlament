<template>
  <div class="step-body">
    <SessionField :model-value="selectedKey" :items="sessionItems" @update:model-value="requestSelection" />
    <div v-if="working" class="session-editor" @input="validated = true" @change="validated = true">
      <GymField
        :model-value="working.gymId"
        :items="snapshot.gyms"
        :errors="errorsFor('gymId')"
        @update:model-value="updateGym"
      />
      <v-alert v-for="warning in snapshotWarning('gymId')" :key="warning.message" type="warning" variant="tonal" density="compact" class="field-warning">
        {{ warning.message }}
      </v-alert>
      <v-expansion-panels v-model="openPanels" multiple variant="accordion" class="machine-panels">
        <MachinePanel
          v-for="(machine, index) in working.machines"
          :key="`${machine.sourceIndex ?? 'new'}-${index}`"
          :machine="machine"
          :index="index"
          :items="snapshot.machines"
          :selected-ids="selectedMachineIds"
          :errors="machineErrors(index)"
          :warnings="machineWarnings(machine.sourceIndex)"
          :validated="validated"
          :add-disabled="working.machines.length >= 10"
          :delete-disabled="working.machines.length <= 1"
          @update="updateMachine(index, $event)"
          @add="addMachine(index)"
          @delete="deleteMachine(index)"
          @add-set="addSet(index, $event)"
          @delete-set="deleteSet(index, $event)"
        />
      </v-expansion-panels>
      <NotesField :model-value="working.notes" :errors="errorsFor('notes')" @update:model-value="updateNotes" />
    </div>

    <v-stepper-actions :disabled="validationErrors.length > 0 ? 'next' : false" class="step-actions">
      <template #prev="{ props: actionProps }">
        <v-btn v-bind="actionProps" class="mr-2" variant="text" @click="emit('back')">戻る</v-btn>
      </template>
      <template #next="{ props: actionProps }">
        <div class="step-next-actions">
          <v-tooltip :disabled="!showValidationTooltip" text="入力された値に問題が1件以上あります。確認し、修正してください。">
            <template #activator="{ props: tooltipProps }">
              <span v-bind="tooltipProps">
                <v-btn v-bind="actionProps" class="primary-action" variant="flat" density="compact" @click="confirmUpdate">次へ</v-btn>
              </span>
            </template>
          </v-tooltip>
          <v-btn v-if="selectedKey !== newKey" color="error" variant="text" @click="confirmDelete">削除</v-btn>
        </div>
      </template>
    </v-stepper-actions>

    <DialogFrame
      v-model:open="switchDialog"
      title="確認"
      primary-label="切り替える"
      @close="cancelSelection"
      @primary="acceptSelection"
    >
      <p>入力内容は破棄されます。<br />本当に切り替えますか？</p>
    </DialogFrame>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WorkoutDateSnapshot, WorkoutFieldMessage, WorkoutMachineInput, WorkoutSessionInput } from '@workout-lab/frontend-common'
import { cloneSession, emptyMachine, emptySession, emptySet, type Mode } from '../model'
import { validateSession } from '../validation'
import DialogFrame from '../common/DialogFrame.vue'
import GymField from './form/Gym.vue'
import NotesField from './form/Notes.vue'
import SessionField from './form/Session.vue'
import MachinePanel from './block/MachinePanel.vue'

const newKey = '__new__'
const props = defineProps<{ snapshot: WorkoutDateSnapshot; serverErrors: WorkoutFieldMessage[] }>()
const emit = defineEmits<{
  back: []
  changed: []
  confirm: [mode: Mode, sessionId: string | null, session: WorkoutSessionInput]
}>()
const selectedKey = ref(newKey)
const pendingKey = ref<string | null>(null)
const working = ref<WorkoutSessionInput | null>(null)
const original = ref<WorkoutSessionInput | null>(null)
const openPanels = ref<number[]>([])
const switchDialog = ref(false)
const validated = ref(false)

const sessionItems = computed(() => [
  ...props.snapshot.sessions.map((session, index) => ({ title: `セッション${index + 1}`, value: session.sessionId })),
  { title: 'セッションを追加する', value: newKey },
])
const selectedSession = computed(() => props.snapshot.sessions.find(session => session.sessionId === selectedKey.value) ?? null)
const dirty = computed(() => JSON.stringify(working.value) !== JSON.stringify(original.value))
const clientErrors = computed(() => working.value ? validateSession(working.value, original.value, props.snapshot.gyms, props.snapshot.machines) : [])
const validationErrors = computed(() => [...clientErrors.value, ...props.serverErrors])
const errorMap = computed(() => validationErrors.value.reduce<Record<string, string[]>>((map, error) => {
  ;(map[error.path] ??= []).push(error.message)
  return map
}, {}))
const selectedMachineIds = computed(() => working.value?.machines.map(machine => machine.machineId).filter((id): id is string => Boolean(id)) ?? [])
const showValidationTooltip = computed(() => openPanels.value.length > 0 && validationErrors.value.length > 0)

watch(() => props.snapshot, initialize, { immediate: true })

function initialize() {
  const first = props.snapshot.sessions[0]
  loadSelection(first?.sessionId ?? newKey)
}

function loadSelection(key: string) {
  selectedKey.value = key
  const selected = props.snapshot.sessions.find(session => session.sessionId === key)
  const value = selected ? cloneSession(selected.session) : emptySession(props.snapshot.date)
  working.value = value
  original.value = cloneSession(value)
  validated.value = false
  openPanels.value = [0]
}

function requestSelection(key: string) {
  if (key === selectedKey.value) return
  if (!dirty.value) {
    loadSelection(key)
    return
  }
  pendingKey.value = key
  switchDialog.value = true
}

function acceptSelection() {
  const key = pendingKey.value
  switchDialog.value = false
  pendingKey.value = null
  if (key) loadSelection(key)
}

function cancelSelection() {
  switchDialog.value = false
  pendingKey.value = null
}

function markChanged() { validated.value = true; emit('changed') }
function updateGym(value: string | null) { if (working.value) working.value.gymId = value; markChanged() }
function updateNotes(value: string | null) { if (working.value) working.value.notes = value; markChanged() }
function updateMachine(index: number, value: WorkoutMachineInput) { if (working.value) working.value.machines[index] = value; markChanged() }
function addMachine(index: number) {
  if (!working.value || working.value.machines.length >= 10) return
  working.value.machines.splice(index + 1, 0, emptyMachine())
  openPanels.value = [index + 1]
  markChanged()
}
function deleteMachine(index: number) {
  if (!working.value || working.value.machines.length <= 1) return
  working.value.machines.splice(index, 1)
  markChanged()
}
function addSet(machineIndex: number, setIndex: number) {
  const sets = working.value?.machines[machineIndex]?.sets
  if (!sets || sets.length >= 10) return
  sets.splice(setIndex + 1, 0, emptySet())
  markChanged()
}
function deleteSet(machineIndex: number, setIndex: number) {
  const sets = working.value?.machines[machineIndex]?.sets
  if (!sets || sets.length <= 1) return
  sets.splice(setIndex, 1)
  markChanged()
}
function errorsFor(path: string) { return errorMap.value[path] ?? [] }
function machineErrors(index: number) {
  const prefix = `machines[${index}].`
  return Object.fromEntries(Object.entries(errorMap.value).filter(([path]) => path.startsWith(prefix)).map(([path, errors]) => [path.slice(prefix.length), errors]))
}
function snapshotWarning(path: string) { return selectedSession.value?.warnings.filter(warning => warning.path === path) ?? [] }
function machineWarnings(sourceIndex: number | null) {
  return sourceIndex == null ? [] : snapshotWarning(`machines[${sourceIndex}].machineId`).map(warning => warning.message)
}
function confirmUpdate() {
  validated.value = true
  if (!working.value || validationErrors.value.length > 0) return
  emit('confirm', selectedKey.value === newKey ? 'create' : 'update', selectedKey.value === newKey ? null : selectedKey.value, cloneSession(working.value))
}
function confirmDelete() {
  if (working.value && selectedKey.value !== newKey) emit('confirm', 'delete', selectedKey.value, cloneSession(working.value))
}
</script>

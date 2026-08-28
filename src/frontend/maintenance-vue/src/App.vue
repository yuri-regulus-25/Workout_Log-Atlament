<template>
  <v-app>
    <main ref="shell" class="maintenance-shell">
      <header class="maintenance-header">
        <div>
          <p class="eyebrow">Atlament</p>
          <h1 ref="pageHeading" tabindex="-1">Master Maintenance</h1>
        </div>
        <v-btn icon="mdi-refresh" variant="tonal" :loading="loading" aria-label="Refresh" @click="loadAll" />
      </header>

      <v-alert v-if="message" class="status-alert" :type="message.type" variant="tonal" closable @click:close="message = null">
        {{ message.text }}
      </v-alert>

      <section class="maintenance-toolbar">
        <v-btn-toggle v-model="selectedType" mandatory density="comfortable" variant="outlined">
          <v-btn value="MACHINE_MASTER">Machines</v-btn>
          <v-btn value="GYM_MASTER">Gyms</v-btn>
        </v-btn-toggle>
        <v-btn-toggle v-model="displayMode" mandatory density="comfortable" variant="outlined">
          <v-btn value="active">Active</v-btn>
          <v-btn value="deleted">Deleted</v-btn>
          <v-btn value="all">All</v-btn>
        </v-btn-toggle>
        <v-spacer />
        <v-chip variant="tonal" size="small">{{ currentRevisionLabel }}</v-chip>
        <v-btn prepend-icon="mdi-plus" color="primary" @click="openCreate">Create</v-btn>
      </section>

      <v-data-table
        class="maintenance-table"
        :headers="tableHeaders"
        :items="visibleRecords"
        :loading="loading"
        item-value="id"
        hover
        density="comfortable"
        @click:row="onRowClick"
      >
        <template #item.state="{ item }">
          <v-chip :color="item.deleted ? 'error' : item.active ? 'success' : 'warning'" size="small" variant="tonal">
            {{ item.deleted ? 'Deleted' : item.active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>
        <template #item.main="{ item }">
          <v-icon v-if="isGym(item) && item.main" icon="mdi-star" color="primary" aria-hidden="true" />
        </template>
        <template #item.actions="{ item }">
          <div class="row-actions" @click.stop>
            <v-btn icon="mdi-content-copy" variant="text" size="small" aria-label="Copy" @click="openCopy(item)" />
            <v-btn
              :icon="item.deleted ? 'mdi-restore' : 'mdi-delete-outline'"
              variant="text"
              size="small"
              :aria-label="item.deleted ? 'Restore' : 'Delete'"
              @click="toggleDeleted(item)"
            />
          </div>
        </template>
      </v-data-table>

      <v-dialog v-model="dialogOpen" max-width="720" persistent>
        <v-card>
          <v-card-title>{{ dialogMode === 'create' ? 'Create' : 'Edit' }} {{ selectedType === 'MACHINE_MASTER' ? 'Machine' : 'Gym' }}</v-card-title>
          <v-card-text>
            <v-form class="record-form" @submit.prevent="saveDialog">
              <template v-if="machineDraft">
                <v-text-field v-model.trim="machineDraft.machine_id" label="Machine ID" :error-messages="idError" :disabled="dialogMode === 'edit'" />
                <v-text-field v-model.trim="machineDraft.name" label="Name" />
                <v-select v-model="machineDraft.body_part" label="Body Part" :items="bodyParts" />
                <v-text-field v-model="aliasText" label="Aliases" />
                <v-switch v-model="machineDraft.active" label="Active" color="primary" />
                <v-switch v-model="machineDraft.deleted" label="Deleted" color="error" />
              </template>
              <template v-if="gymDraft">
                <v-text-field v-model.trim="gymDraft.gym_id" label="Gym ID" :error-messages="idError" :disabled="dialogMode === 'edit'" />
                <v-text-field v-model.trim="gymDraft.name" label="Name" />
                <v-text-field v-model.trim="gymDraft.short_name" label="Short Name" />
                <v-switch v-model="gymDraft.active" label="Active" color="primary" />
                <v-switch v-model="gymDraft.deleted" label="Deleted" color="error" />
                <v-switch v-model="gymDraft.main" label="Main Gym" color="primary" />
              </template>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-btn color="primary" :loading="saving" :disabled="!canSave" @click="saveDialog">
              {{ dialogMode === 'create' ? 'Create' : 'Update' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="discardOpen" max-width="420">
        <v-card>
          <v-card-title>Discard changes?</v-card-title>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="discardOpen = false">Cancel</v-btn>
            <v-btn color="error" @click="discardDraft">Discard</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { getMasterDocument, updateMasterDocument, type MasterDocumentType } from '@workout-lab/frontend-common'

type MachineRecord = {
  machine_id: string
  name: string
  body_part: string
  aliases: string[]
  active: boolean
  deleted: boolean
}

type GymRecord = {
  gym_id: string
  name: string
  short_name?: string
  active: boolean
  deleted: boolean
  main: boolean
}

type RecordDraft = MachineRecord | GymRecord

const bodyParts = ['chest', 'back', 'legs', 'shoulders', 'arms', 'glutes', 'core', 'cardio', 'other']
const selectedType = ref<MasterDocumentType>('MACHINE_MASTER')
const displayMode = ref<'active' | 'deleted' | 'all'>('active')
const loading = ref(false)
const saving = ref(false)
const machineRevision = ref('')
const gymRevision = ref('')
const machines = ref<MachineRecord[]>([])
const gyms = ref<GymRecord[]>([])
const dialogOpen = ref(false)
const discardOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const machineDraft = ref<MachineRecord | null>(null)
const gymDraft = ref<GymRecord | null>(null)
const originalDraft = ref('')
const aliasText = ref('')
const message = ref<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
const shell = ref<HTMLElement | null>(null)
const pageHeading = ref<HTMLElement | null>(null)

onMounted(() => {
  initializeAppNavigation({ currentRouteId: 'maintenance', shell: shell.value ?? document.body })
  pageHeading.value?.focus()
  void loadAll()
})

watch(aliasText, (value) => {
  if (machineDraft.value) {
    machineDraft.value.aliases = value.split(',').map((alias) => alias.trim()).filter(Boolean)
  }
})

const activeDraft = computed<RecordDraft | null>(() => machineDraft.value ?? gymDraft.value)

const currentRevisionLabel = computed(() => {
  const revision = selectedType.value === 'MACHINE_MASTER' ? machineRevision.value : gymRevision.value
  return revision ? `revision ${revision.slice(0, 10)}` : 'no revision'
})

const records = computed(() => selectedType.value === 'MACHINE_MASTER' ? machines.value : gyms.value)

const visibleRecords = computed(() => records.value.filter((record) => {
  if (displayMode.value === 'all') return true
  if (displayMode.value === 'deleted') return record.deleted
  return !record.deleted
}))

const tableHeaders = computed(() => selectedType.value === 'MACHINE_MASTER'
  ? [
      { title: 'ID', key: 'machine_id' },
      { title: 'Name', key: 'name' },
      { title: 'Body Part', key: 'body_part' },
      { title: 'State', key: 'state', sortable: false },
      { title: '', key: 'actions', sortable: false, width: 96 },
    ]
  : [
      { title: 'ID', key: 'gym_id' },
      { title: 'Name', key: 'name' },
      { title: 'Short Name', key: 'short_name' },
      { title: 'Main', key: 'main', sortable: false },
      { title: 'State', key: 'state', sortable: false },
      { title: '', key: 'actions', sortable: false, width: 96 },
    ])

const idError = computed(() => {
  if (!activeDraft.value || dialogMode.value === 'edit') return ''
  const id = recordId(activeDraft.value)
  if (!id) return 'ID is required.'
  return records.value.some((record) => recordId(record) === id) ? 'ID already exists.' : ''
})

const dirty = computed(() => activeDraft.value !== null && JSON.stringify(activeDraft.value) !== originalDraft.value)
const canSave = computed(() => activeDraft.value !== null && !idError.value && recordId(activeDraft.value) && activeDraft.value.name.trim())

async function loadAll() {
  loading.value = true
  try {
    const [machineResult, gymResult] = await Promise.all([
      getMasterDocument('MACHINE_MASTER'),
      getMasterDocument('GYM_MASTER'),
    ])
    if (!machineResult.success || !machineResult.data || !gymResult.success || !gymResult.data) {
      throw new Error([...machineResult.errors, ...gymResult.errors][0]?.message ?? 'Master documents are unavailable.')
    }

    const machineDocument = JSON.parse(machineResult.data.content) as { machines: MachineRecord[] }
    const gymDocument = JSON.parse(gymResult.data.content) as { gyms: GymRecord[] }
    machines.value = machineDocument.machines
    gyms.value = gymDocument.gyms
    machineRevision.value = machineResult.data.revision
    gymRevision.value = gymResult.data.revision
  } catch (error) {
    message.value = { type: 'error', text: error instanceof Error ? error.message : 'Master load failed.' }
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  machineDraft.value = selectedType.value === 'MACHINE_MASTER'
    ? { machine_id: '', name: '', body_part: 'other', aliases: [], active: true, deleted: false }
    : null
  gymDraft.value = selectedType.value === 'GYM_MASTER'
    ? { gym_id: '', name: '', short_name: '', active: true, deleted: false, main: false }
    : null
  aliasText.value = ''
  originalDraft.value = JSON.stringify(activeDraft.value)
  dialogOpen.value = true
}

function openEdit(record: RecordDraft) {
  dialogMode.value = 'edit'
  machineDraft.value = isMachine(record) ? structuredClone(record) : null
  gymDraft.value = isGym(record) ? structuredClone(record) : null
  aliasText.value = machineDraft.value ? machineDraft.value.aliases.join(', ') : ''
  originalDraft.value = JSON.stringify(activeDraft.value)
  dialogOpen.value = true
}

function openCopy(record: RecordDraft) {
  dialogMode.value = 'create'
  if (isMachine(record)) {
    machineDraft.value = structuredClone(record)
    gymDraft.value = null
    machineDraft.value.machine_id = ''
    machineDraft.value.active = true
    machineDraft.value.deleted = false
    aliasText.value = machineDraft.value.aliases.join(', ')
  } else {
    gymDraft.value = structuredClone(record)
    machineDraft.value = null
    gymDraft.value.gym_id = ''
    gymDraft.value.active = true
    gymDraft.value.deleted = false
    gymDraft.value.main = false
    aliasText.value = ''
  }
  originalDraft.value = JSON.stringify(activeDraft.value)
  dialogOpen.value = true
}

async function toggleDeleted(record: RecordDraft) {
  const next = structuredClone(record)
  next.deleted = !next.deleted
  next.active = !next.deleted
  await saveRecord(next, 'edit')
}

function closeDialog() {
  if (dirty.value) {
    discardOpen.value = true
    return
  }
  resetDialog()
}

function discardDraft() {
  discardOpen.value = false
  resetDialog()
}

function resetDialog() {
  dialogOpen.value = false
  machineDraft.value = null
  gymDraft.value = null
  originalDraft.value = ''
  aliasText.value = ''
}

async function saveDialog() {
  if (!activeDraft.value || !canSave.value) return
  await saveRecord(activeDraft.value, dialogMode.value)
  resetDialog()
}

async function saveRecord(record: RecordDraft, mode: 'create' | 'edit') {
  saving.value = true
  try {
    if (selectedType.value === 'MACHINE_MASTER') {
      const next = mode === 'create'
        ? [...machines.value, record as MachineRecord]
        : machines.value.map((machine) => machine.machine_id === (record as MachineRecord).machine_id ? record as MachineRecord : machine)
      const result = await updateMasterDocument('MACHINE_MASTER', {
        expectedRevision: machineRevision.value,
        content: JSON.stringify({ schema_version: 1, machines: next }, null, 2),
      })
      if (!result.success || !result.data) throw new Error(result.errors[0]?.message ?? 'Machine master save failed.')
      machines.value = next
      machineRevision.value = result.data.revision
    } else {
      const next = mode === 'create'
        ? [...gyms.value, record as GymRecord]
        : gyms.value.map((gym) => gym.gym_id === (record as GymRecord).gym_id ? record as GymRecord : gym)
      const result = await updateMasterDocument('GYM_MASTER', {
        expectedRevision: gymRevision.value,
        content: JSON.stringify({ schema_version: 1, gyms: next }, null, 2),
      })
      if (!result.success || !result.data) throw new Error(result.errors[0]?.message ?? 'Gym master save failed.')
      gyms.value = next
      gymRevision.value = result.data.revision
    }
    message.value = { type: 'success', text: 'Saved.' }
  } catch (error) {
    message.value = { type: 'error', text: error instanceof Error ? error.message : 'Save failed.' }
  } finally {
    saving.value = false
  }
}

function recordId(record: RecordDraft): string {
  return isMachine(record) ? record.machine_id : record.gym_id
}

function onRowClick(_: MouseEvent, row: { item: RecordDraft }) {
  openEdit(row.item)
}

function isMachine(record: RecordDraft): record is MachineRecord {
  return 'machine_id' in record
}

function isGym(record: RecordDraft): record is GymRecord {
  return 'gym_id' in record
}
</script>

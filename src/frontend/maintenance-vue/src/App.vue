<template>
  <v-app>
    <main ref="shell" :class="['app-shell', 'maintenance-shell', pageTransitionClassName]">
      <div data-application-shell-content>
        <v-alert v-if="message" class="status-alert mb-4" :type="message.type" variant="tonal" density="compact" ariant="outlined" closable @click:close="message = null">
          {{ message.text }}
        </v-alert>

        <section class="panel wide maintenance-panel">
          <div class="maintenance-toolbar">
            <v-btn-toggle v-model="viewMode" mandatory density="comfortable" variant="outlined">
              <v-btn value="masters">マスター</v-btn>
              <v-btn value="unresolved">未解決参照</v-btn>
              <v-btn value="recovery">修復が必要なデータ</v-btn>
            </v-btn-toggle>
            <v-btn-toggle v-if="viewMode !== 'recovery'" v-model="selectedType" mandatory density="comfortable" variant="outlined">
              <v-btn value="MACHINE_MASTER">マシン</v-btn>
              <v-btn value="GYM_MASTER">ジム</v-btn>
            </v-btn-toggle>
            <v-btn-toggle v-if="viewMode === 'masters'" v-model="displayMode" mandatory density="comfortable" variant="outlined">
              <v-btn value="active">有効</v-btn>
              <v-btn value="deleted">削除済み</v-btn>
              <v-btn value="all">すべて</v-btn>
            </v-btn-toggle>
            <v-spacer />
            <v-btn v-if="viewMode === 'masters'" class="accent-create-button" variant="flat" prepend-icon="mdi-plus-thick" @click="openCreate" >新規作成</v-btn>
          </div>

          <RecoveryPanel v-if="viewMode === 'recovery'" @message="message = $event" />

          <p v-if="viewMode === 'unresolved'" class="maintenance-description">
            ワークアウトから参照している情報が見つからない状態です。ワークアウト記録そのものは変更せず、不足情報の追加・復元・既存情報への解決を行えます。
          </p>

          <MasterRecordsTable
            v-if="viewMode === 'masters'"
            :type="selectedType"
            :headers="tableHeaders"
            :records="visibleRecords"
            :loading="loading"
            @row-click="onRowClick"
            @copy="openCopy"
            @request-lifecycle-toggle="requestLifecycleToggle"
            @request-main-gym="requestMainGym"
          />

          <v-data-table
            v-else-if="viewMode === 'unresolved'"
            class="maintenance-table"
            :headers="unresolvedHeaders"
            :items="visibleUnresolved"
            :items-per-page-text="'Show Items'"
            :loading="loading ? 'primary' : false"
            item-value="referenceId"
            no-data-text="データがありません"
            hover
            density="comfortable"
          >
            <template #item.type="{ item }">
              <v-chip size="small" variant="tonal">{{ masterTypeLabel(item.type) }}</v-chip>
            </template>
            <template #item.affected="{ item }">
              <v-chip size="small" variant="tonal">{{ item.affectedWorkouts.length }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <div class="row-actions" @click.stop>
              <v-btn icon="mdi-eye-outline" variant="text" size="small" aria-label="確認" @click.stop="inspectUnresolved(item)" />
              <v-btn icon="mdi-link-variant" variant="text" size="small" aria-label="既存マスターへ解決" @click.stop="openResolve(item)" />
              <v-btn icon="mdi-plus" variant="text" size="small" aria-label="新規作成" @click.stop="createFromUnresolved(item)" />
              </div>
            </template>
          </v-data-table>
        </section>
      </div>

      <MasterRecordEditorDialog
        v-model:open="dialogOpen"
        v-model:alias-text="aliasText"
        :title="dialogTitle"
        :dialog-mode="dialogMode"
        :machine-draft="machineDraft"
        :gym-draft="gymDraft"
        :body-parts="bodyParts"
        :id-error="idError"
        :saving="saving"
        :can-save="Boolean(canSave)"
        @close="closeDialog"
        @save="saveDialog"
      />

      <v-dialog v-model="confirmOpen" max-width="460">
        <v-card>
          <v-card-title>{{ confirmTitle }}</v-card-title>
          <v-card-text>{{ confirmText }}</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="confirmOpen = false">キャンセル</v-btn>
            <v-btn color="primary" :loading="saving" @click="confirmOperation">実行</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <UnresolvedReferenceResolutionDialog
        v-model:open="resolveOpen"
        v-model:resolve-target-id="resolveTargetId"
        :selected-unresolved="selectedUnresolved"
        :resolve-options="resolveOptions"
        :saving="saving"
        @resolve="resolveToExisting"
      />
    </main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import { formatBodyPart } from '@workout-lab/workout-core'
import MasterRecordEditorDialog from './MasterRecordEditorDialog.vue'
import MasterRecordsTable from './MasterRecordsTable.vue'
import RecoveryPanel from './RecoveryPanel.vue'
import UnresolvedReferenceResolutionDialog from './UnresolvedReferenceResolutionDialog.vue'
import {
  cloneRecordDraft,
  cloneGymRecord,
  cloneMachineRecord,
  isGym,
  isMachine,
  isRecordDraft,
  masterTypeLabel,
  recordId,
  toUserFacingMasterWriteError,
  type GymRecord,
  type MachineRecord,
  type RecordDraft,
} from './maintenance-master-records'
import {
  getMasterDocument,
  getUnresolvedMasterReferences,
  updateMasterDocument,
  type MasterDocumentType,
  type UnresolvedMasterReference,
} from '@workout-lab/frontend-common'

const bodyPartValues = ['chest', 'back', 'legs', 'shoulders', 'arms', 'glutes', 'core', 'cardio', 'other']
const bodyParts = bodyPartValues.map((bodyPart) => ({ title: formatBodyPart(bodyPart), value: bodyPart }))
const viewMode = ref<'masters' | 'unresolved' | 'recovery'>('masters')
const selectedType = ref<MasterDocumentType>('MACHINE_MASTER')
const displayMode = ref<'active' | 'deleted' | 'all'>('active')
const loading = ref(false)
const saving = ref(false)
const machineRevision = ref('')
const gymRevision = ref('')
const machines = ref<MachineRecord[]>([])
const gyms = ref<GymRecord[]>([])
const unresolved = ref<UnresolvedMasterReference[]>([])
const dialogOpen = ref(false)
const confirmOpen = ref(false)
const resolveOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const machineDraft = ref<MachineRecord | null>(null)
const gymDraft = ref<GymRecord | null>(null)
const pendingOperation = ref<{ kind: 'lifecycle' | 'main-gym'; record: RecordDraft } | null>(null)
const selectedUnresolved = ref<UnresolvedMasterReference | null>(null)
const resolveTargetId = ref('')
const aliasText = ref('')
const message = ref<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
const shell = ref<HTMLElement | null>(null)
let navigation: { dispose: () => void } | null = null
let shellNavigation: { dispose: () => void; focusTitle: () => void } | null = null

onMounted(() => {
  shellNavigation = initializeAppNavigation({
    currentRouteId: 'maintenance',
    shell: shell.value ?? document.body,
    screen: {
      eyebrow: 'Atlament / Resource Management',
      title: 'Resource Management',
      description: ['リソース情報を管理する', '登録情報の変更や、未解決の参照を確認します'],
      ariaLabel: 'Atlament Resource Management',
    },
  })
  navigation = shellNavigation
  shellNavigation.focusTitle()
  void loadAll()
})

onBeforeUnmount(() => {
  shellNavigation?.dispose()
})

watch(aliasText, (value) => {
  if (machineDraft.value) {
    machineDraft.value.aliases = value.split(',').map((alias) => alias.trim()).filter(Boolean)
  }
})

const activeDraft = computed<RecordDraft | null>(() => machineDraft.value ?? gymDraft.value)
const dialogTitle = computed(() => `${dialogActionLabel.value} - ${masterTypeLabel(selectedType.value)}情報`)
const dialogActionLabel = computed(() => {
  if (dialogMode.value === 'edit') return '編集'
  return originalDraftWasCopied.value ? '別名保存' : '新規作成'
})
const originalDraftWasCopied = ref(false)

const confirmTitle = computed(() => {
  if (!pendingOperation.value) return ''
  return '確認'
})

const confirmText = computed(() => {
  if (!pendingOperation.value) return ''
  if (pendingOperation.value.kind === 'main-gym') return '選択した有効なジムをメインジムにし、現在のメインジムを解除します。'
  return '本当に更新しますか？'
})

const records = computed(() => selectedType.value === 'MACHINE_MASTER' ? machines.value : gyms.value)
const visibleUnresolved = computed(() => unresolved.value.filter((item) => item.type === selectedType.value))
const resolveOptions = computed(() => records.value
  .filter((record) => record.active && !record.deleted)
  .map((record) => ({ title: `${recordId(record)} - ${record.name}`, value: recordId(record) })))

const visibleRecords = computed(() => records.value.filter((record) => {
  if (displayMode.value === 'all') return true
  if (displayMode.value === 'deleted') return record.deleted
  return !record.deleted
}))

const tableHeaders = computed(() => selectedType.value === 'MACHINE_MASTER'
  ? [
      { title: 'ID', key: 'machine_id', width: 180 },
      { title: '名前', key: 'name', width: 240 },
      { title: '部位', key: 'body_part', width: 120 },
      { title: '状態', key: 'state', sortable: false, width: 112 },
      { title: '', key: 'actions', sortable: false, width: 112 },
    ]
  : [
      { title: 'ID', key: 'gym_id', width: 180 },
      { title: '名前', key: 'name', width: 320 },
      { title: '短縮名', key: 'short_name', width: 160 },
      { title: 'メイン', key: 'main', sortable: false, width: 96 },
      { title: '状態', key: 'state', sortable: false, width: 112 },
      { title: '', key: 'actions', sortable: false, width: 144 },
    ])

const unresolvedHeaders = [
  { title: '種別', key: 'type', sortable: false },
  { title: '参照ID', key: 'referenceId' },
  { title: '影響', key: 'affected', sortable: false },
  { title: '', key: 'actions', sortable: false, width: 128 },
]

const idError = computed(() => {
  if (!activeDraft.value || dialogMode.value === 'edit') return ''
  const id = recordId(activeDraft.value)
  if (!id) return 'IDは必須です。'
  return records.value.some((record) => recordId(record) === id) ? 'IDはすでに存在します。' : ''
})

const canSave = computed(() => activeDraft.value !== null && !idError.value && recordId(activeDraft.value) && activeDraft.value.name.trim())

async function loadAll() {
  loading.value = true
  try {
    const [machineResult, gymResult] = await Promise.all([
      getMasterDocument('MACHINE_MASTER'),
      getMasterDocument('GYM_MASTER'),
    ])
    if (!machineResult.success || !machineResult.data || !gymResult.success || !gymResult.data) {
      throw {
        errors: [...machineResult.errors, ...gymResult.errors],
      }
    }

    const machineDocument = JSON.parse(machineResult.data.content) as { machines: MachineRecord[] }
    const gymDocument = JSON.parse(gymResult.data.content) as { gyms: GymRecord[] }
    machines.value = machineDocument.machines
    gyms.value = gymDocument.gyms
    machineRevision.value = machineResult.data.revision
    gymRevision.value = gymResult.data.revision
    await loadUnresolved()
  } catch (error) {
    reportDiagnostic('Master load failed.', error)
    message.value = { type: 'error', text: 'マスターデータを読み込めませんでした。設定情報と同期状態を確認してください。' }
  } finally {
    loading.value = false
  }
}

async function loadUnresolved() {
  const result = await getUnresolvedMasterReferences()
  unresolved.value = result.success && result.data ? result.data : []
}

function openCreate() {
  dialogMode.value = 'create'
  originalDraftWasCopied.value = false
  machineDraft.value = selectedType.value === 'MACHINE_MASTER'
    ? { machine_id: '', source_ids: [], name: '', body_part: 'other', aliases: [], active: true, deleted: false }
    : null
  gymDraft.value = selectedType.value === 'GYM_MASTER'
    ? { gym_id: '', source_ids: [], name: '', short_name: '', active: true, deleted: false, main: false }
    : null
  aliasText.value = ''
  dialogOpen.value = true
}

function openEdit(record: RecordDraft) {
  dialogMode.value = 'edit'
  originalDraftWasCopied.value = false
  machineDraft.value = isMachine(record) ? cloneMachineRecord(record) : null
  gymDraft.value = isGym(record) ? cloneGymRecord(record) : null
  aliasText.value = machineDraft.value ? machineDraft.value.aliases.join(', ') : ''
  dialogOpen.value = true
}

function openCopy(record: RecordDraft) {
  dialogMode.value = 'create'
  originalDraftWasCopied.value = true
  if (isMachine(record)) {
    const draft = cloneMachineRecord(record)
    draft.machine_id = ''
    draft.source_ids = []
    draft.active = true
    draft.deleted = false
    machineDraft.value = draft
    gymDraft.value = null
    aliasText.value = draft.aliases.join(', ')
  } else {
    const draft = cloneGymRecord(record)
    draft.gym_id = ''
    draft.source_ids = []
    draft.active = true
    draft.deleted = false
    draft.main = false
    gymDraft.value = draft
    machineDraft.value = null
    aliasText.value = ''
  }
  dialogOpen.value = true
}

function inspectUnresolved(item: UnresolvedMasterReference) {
  selectedUnresolved.value = item
  resolveTargetId.value = ''
  resolveOpen.value = true
}

function openResolve(item: UnresolvedMasterReference) {
  selectedType.value = item.type
  inspectUnresolved(item)
}

function createFromUnresolved(item: UnresolvedMasterReference) {
  selectedType.value = item.type
  viewMode.value = 'masters'
  dialogMode.value = 'create'
  originalDraftWasCopied.value = false
  if (item.type === 'MACHINE_MASTER') {
    machineDraft.value = { machine_id: item.referenceId, source_ids: [], name: item.referenceId, body_part: 'other', aliases: [], active: true, deleted: false }
    gymDraft.value = null
    aliasText.value = ''
  } else {
    gymDraft.value = { gym_id: item.referenceId, source_ids: [], name: item.referenceId, short_name: '', active: true, deleted: false, main: false }
    machineDraft.value = null
    aliasText.value = ''
  }
  dialogOpen.value = true
}

async function resolveToExisting() {
  if (!selectedUnresolved.value || !resolveTargetId.value) return
  const unresolvedItem = selectedUnresolved.value
  const targetId = resolveTargetId.value
  const next = records.value.map((record) => {
    if (recordId(record) !== targetId) return record
    const sourceIds = new Set([...(record.source_ids ?? []), unresolvedItem.referenceId])
    return { ...record, source_ids: Array.from(sourceIds).sort() }
  })
  await saveRecords(unresolvedItem.type, next)
  resolveOpen.value = false
}

function requestLifecycleToggle(record: RecordDraft) {
  if (!record.deleted && isGym(record) && record.main) {
    message.value = { type: 'error', text: 'メインジムは削除できません。' }
    return
  }
  pendingOperation.value = { kind: 'lifecycle', record }
  confirmOpen.value = true
}

async function toggleDeleted(record: RecordDraft) {
  const next = cloneRecordDraft(record)
  next.deleted = !next.deleted
  next.active = !next.deleted
  await saveRecord(next, 'edit')
}

function requestMainGym(record: GymRecord) {
  if (record.deleted || !record.active) {
    message.value = { type: 'error', text: '無効または削除済みのジムはメインジムにできません。' }
    return
  }
  if (record.main) return
  pendingOperation.value = { kind: 'main-gym', record }
  confirmOpen.value = true
}

async function confirmOperation() {
  if (!pendingOperation.value) return
  const operation = pendingOperation.value
  confirmOpen.value = false
  pendingOperation.value = null
  if (operation.kind === 'lifecycle') {
    await toggleDeleted(operation.record)
    return
  }

  await saveMainGym(operation.record as GymRecord)
}

function closeDialog() {
  resetDialog()
}

function resetDialog() {
  dialogOpen.value = false
  machineDraft.value = null
  gymDraft.value = null
  originalDraftWasCopied.value = false
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
      await saveRecords('MACHINE_MASTER', next)
    } else {
      const next = mode === 'create'
        ? [...gyms.value, record as GymRecord]
        : gyms.value.map((gym) => gym.gym_id === (record as GymRecord).gym_id ? record as GymRecord : gym)
      await saveRecords('GYM_MASTER', next)
    }
    message.value = { type: 'success', text: '保存しました。' }
  } catch (error) {
    reportDiagnostic('Master save failed.', error)
    message.value = { type: 'error', text: toUserFacingMasterWriteError(error) }
  } finally {
    saving.value = false
  }
}

async function saveRecords(type: MasterDocumentType, next: RecordDraft[]) {
  const result = await updateMasterDocument(type, {
    expectedRevision: type === 'MACHINE_MASTER' ? machineRevision.value : gymRevision.value,
    content: JSON.stringify(type === 'MACHINE_MASTER'
      ? { schema_version: 1, machines: next }
      : { schema_version: 1, gyms: next }, null, 2),
  })
  if (!result.success || !result.data) throw result
  if (type === 'MACHINE_MASTER') {
    machines.value = next as MachineRecord[]
    machineRevision.value = result.data.revision
  } else {
    gyms.value = next as GymRecord[]
    gymRevision.value = result.data.revision
  }
  await loadUnresolved()
}

async function saveMainGym(record: GymRecord) {
  saving.value = true
  try {
    const next = gyms.value.map((gym) => ({ ...gym, main: gym.gym_id === record.gym_id }))
    const result = await updateMasterDocument('GYM_MASTER', {
      expectedRevision: gymRevision.value,
      content: JSON.stringify({ schema_version: 1, gyms: next }, null, 2),
    })
    if (!result.success || !result.data) throw result
    gyms.value = next
    gymRevision.value = result.data.revision
    message.value = { type: 'success', text: 'メインジムを更新しました。' }
  } catch (error) {
    reportDiagnostic('Main Gym update failed.', error)
    message.value = { type: 'error', text: toUserFacingMasterWriteError(error) }
  } finally {
    saving.value = false
  }
}

function onRowClick(_: MouseEvent, row: { item?: RecordDraft | { raw?: RecordDraft } }) {
  const record = extractRowRecord(row)
  if (record) {
    openEdit(record)
  }
}

function extractRowRecord(row: { item?: RecordDraft | { raw?: RecordDraft } }): RecordDraft | null {
  const item = row.item
  if (!item) return null
  if (isRecordDraft(item)) return item
  const raw = 'raw' in item ? item.raw : undefined
  return isRecordDraft(raw) ? raw : null
}

function reportDiagnostic(context: string, error: unknown) {
  console.error(context, error)
}
</script>

<template>
  <section class="recovery-workspace" aria-label="修復が必要なデータ">
    <div v-if="!selectedResourceKey" class="recovery-stack">
      <div class="recovery-heading-row">
        <div>
          <h2>修復が必要なデータ</h2>
          <p class="maintenance-description">利用できないデータだけを表示しています。内容を確認し、下書きから安全に修復できます。</p>
        </div>
        <v-chip v-if="!loading" variant="tonal" color="primary">{{ resources.length }}件</v-chip>
      </div>

      <v-alert v-if="errorText" type="error" variant="tonal" class="status-alert">
        {{ errorText }}
      </v-alert>

      <div v-if="loading" class="recovery-loading">
        <v-progress-circular indeterminate color="primary" />
        <span>読み込んでいます</span>
      </div>

      <v-alert v-else-if="!errorText && resources.length === 0" type="success" variant="tonal" class="status-alert">
        修復が必要なデータはありません
      </v-alert>

      <div v-else class="recovery-list">
        <button
          v-for="resource in resources"
          :key="resource.resourceKey"
          class="recovery-resource-item"
          type="button"
          @click="selectResource(resource)"
        >
          <span class="resource-main">
            <span class="resource-title">{{ displayPath(resource.path) }}</span>
            <span class="resource-summary">{{ issueSummary(resource.issues) }}</span>
          </span>
          <span class="resource-meta">
            <v-chip size="small" variant="tonal">{{ resourceTypeLabel(resource.resourceType) }}</v-chip>
            <v-chip size="small" :color="resource.hasDraft ? 'info' : 'warning'" variant="tonal">
              {{ resource.hasDraft ? '下書きあり' : '下書きなし' }}
            </v-chip>
          </span>
        </button>
      </div>
    </div>

    <div v-else class="recovery-stack">
      <div class="recovery-detail-top">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="returnToList">一覧へ戻る</v-btn>
        <v-spacer />
        <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="detailLoading" @click="reloadDetail">再読み込み</v-btn>
      </div>

      <v-alert v-if="errorText" type="error" variant="tonal" class="status-alert">
        {{ errorText }}
      </v-alert>

      <div v-if="detailLoading" class="recovery-loading">
        <v-progress-circular indeterminate color="primary" />
        <span>修復内容を読み込んでいます</span>
      </div>

      <template v-else-if="detail">
        <div class="recovery-detail-title">
          <div>
            <h2>{{ displayPath(detail.inspection.path) }}</h2>
            <p class="maintenance-description">{{ resourceTypeLabel(detail.inspection.resourceType) }} / {{ detail.inspection.issues.length }}件の確認事項</p>
          </div>
          <v-chip color="error" variant="tonal">修復が必要</v-chip>
        </div>

        <section class="recovery-section">
            <h3>問題</h3>
            <div class="issue-list">
              <RecoveryIssueCard
                v-for="issue in detail.inspection.issues"
                :key="`${issue.code}:${issue.location?.line ?? ''}:${issue.location?.fieldPath ?? ''}`"
                :issue="issue"
                :title="issueTitle(issue)"
                :context="issueContext(issue)"
              />
            </div>
        </section>

        <section class="recovery-section">
          <div class="recovery-section-header">
            <h3>修復内容</h3>
            <div class="draft-actions">
              <span class="autosave-state" role="status">{{ autosaveText }}</span>
              <v-btn v-if="draftSnapshot?.state === 'active'" variant="text" color="error" prepend-icon="mdi-delete-outline" @click="discardDialogOpen = true">
                下書きを破棄
              </v-btn>
            </div>
          </div>

          <RecoveryDraftStateAlerts :state="draftSnapshot?.state" />

          <div v-if="!activeDraft" class="draft-empty">
            <p>このデータの下書きはまだありません。</p>
            <v-btn color="primary" prepend-icon="mdi-file-edit-outline" :loading="draftLoading" @click="createDraft">下書きを作成</v-btn>
          </div>

          <RecoveryFieldEditor
            v-else
            :fields="activeDraft.fields"
            :suggestions="activeDraft.suggestions"
            :disabled="!canEditDraft"
            @change="updateField($event.fieldPath, { value: $event.value })"
          />
        </section>

        <section class="recovery-section">
          <div class="recovery-section-header">
            <h3>確認結果</h3>
            <v-btn
              color="primary"
              prepend-icon="mdi-check-decagram-outline"
              :loading="validating"
              :disabled="!activeDraft || !canEditDraft"
              @click="validateDraft"
            >
              修復内容を確認
            </v-btn>
          </div>

          <v-alert v-if="validationInvalidated" type="warning" variant="tonal" class="status-alert">
            内容が変更されたため、もう一度確認してください。
          </v-alert>
          <v-alert v-if="validation" :type="validationAlertType" variant="tonal" class="status-alert">
            {{ validationTitle }}
          </v-alert>
          <div v-if="validation" class="validation-detail">
            <div v-if="validation.issues.length > 0" class="issue-list">
              <RecoveryIssueCard
                v-for="issue in validation.issues"
                :key="`${issue.code}:${issue.location?.fieldPath ?? ''}`"
                :issue="issue"
                :title="issueTitle(issue)"
                :context="issueContext(issue)"
              />
            </div>
            <v-alert v-if="validation.pathChange" type="warning" variant="tonal" class="status-alert">
              保存場所が変更されます。変更前: {{ validation.pathChange.from }} / 変更後: {{ validation.pathChange.to }}
            </v-alert>
            <v-btn
              color="primary"
              prepend-icon="mdi-source-commit"
              :disabled="!canCommit"
              :loading="committing"
              @click="confirmCommitOpen = true"
            >
              修復を確定
            </v-btn>
          </div>
        </section>

        <RecoverySourcePanel
          :source-view="sourceView"
          :source-error="sourceError"
          :source-loading="sourceLoading"
          @load-source="loadSource"
        />
      </template>
    </div>

    <v-dialog v-model="discardDialogOpen" max-width="440">
      <v-card>
        <v-card-title>下書きを破棄しますか?</v-card-title>
        <v-card-text>破棄するのはこの画面の下書きだけです。Git上のデータは削除されません。</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="discardDialogOpen = false">キャンセル</v-btn>
          <v-btn color="error" :loading="draftLoading" @click="discardDraft">下書きを破棄</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmCommitOpen" max-width="560" persistent>
      <v-card>
        <v-card-title>修復を確定しますか?</v-card-title>
        <v-card-text v-if="detail && validation" class="commit-confirmation">
          <p>対象データ: {{ displayPath(detail.inspection.path) }}</p>
          <p>保存先: {{ validation.replacementPath }}</p>
          <p>確認結果: {{ validationTitle }}</p>
          <p v-if="validation.pathChange">保存場所が変更されます: {{ validation.pathChange.from }} → {{ validation.pathChange.to }}</p>
          <p v-if="validation.issues.length > 0">確認事項: {{ validation.issues.length }}件</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="committing" @click="confirmCommitOpen = false">キャンセル</v-btn>
          <v-btn color="primary" :loading="committing" :disabled="!canCommit" @click="commitDraft">修復を確定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import RecoveryDraftStateAlerts from './RecoveryDraftStateAlerts.vue'
import RecoveryFieldEditor from './RecoveryFieldEditor.vue'
import RecoveryIssueCard from './RecoveryIssueCard.vue'
import RecoverySourcePanel from './RecoverySourcePanel.vue'
import {
  commitRecoveryDraft,
  createRecoveryDraft,
  deleteRecoveryDraft,
  getRecoveryResource,
  getRecoverySource,
  listRecoveryResources,
  updateRecoveryDraft,
  validateRecoveryDraft,
  type AfError,
  type BrokenResourceSummary,
  type RecoveryDraft,
  type RecoveryDraftSnapshot,
  type RecoveryField,
  type RecoveryResourceDetail,
  type RecoverySourceView,
  type RecoveryValidationResult,
  type ResourceIssue,
  type ResourceType,
} from '@workout-lab/frontend-common'

type FieldChange = { value: unknown }
type AutosaveState = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict'

const emit = defineEmits<{
  message: [{ type: 'success' | 'error' | 'warning'; text: string }]
}>()

const resources = ref<BrokenResourceSummary[]>([])
const selectedResourceKey = ref('')
const detail = ref<RecoveryResourceDetail | null>(null)
const draftSnapshot = ref<RecoveryDraftSnapshot | null>(null)
const sourceView = ref<RecoverySourceView | null>(null)
const validation = ref<RecoveryValidationResult | null>(null)
const validationInvalidated = ref(false)
const loading = ref(false)
const detailLoading = ref(false)
const draftLoading = ref(false)
const sourceLoading = ref(false)
const validating = ref(false)
const committing = ref(false)
const errorText = ref('')
const sourceError = ref(false)
const discardDialogOpen = ref(false)
const confirmCommitOpen = ref(false)
const autosaveState = ref<AutosaveState>('idle')
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let autosaveInFlight = false
let autosavePending = false

const activeDraft = computed(() => draftSnapshot.value?.state === 'active' ? draftSnapshot.value.draft : null)
const canEditDraft = computed(() => draftSnapshot.value?.state === 'active')
const autosaveText = computed(() => {
  if (!activeDraft.value) return ''
  if (autosaveState.value === 'saving') return '保存中...'
  if (autosaveState.value === 'saved') return '下書きを保存しました'
  if (autosaveState.value === 'conflict') return '別の変更が反映されたため、下書きを更新できませんでした'
  if (autosaveState.value === 'failed') return '保存できませんでした'
  return '入力すると下書きに保存されます'
})
const validationAlertType = computed(() => validation.value?.health === 'broken' ? 'error' : validation.value?.health === 'degraded' ? 'warning' : 'success')
const validationTitle = computed(() => {
  if (!validation.value) return ''
  if (validation.value.health === 'healthy') return '修復できます'
  if (validation.value.health === 'degraded') return '修復できますが、確認事項があります'
  return 'まだ修復できない項目があります'
})
const canCommit = computed(() => Boolean(validation.value?.commitAllowed && activeDraft.value && !validationInvalidated.value && !committing.value))

onMounted(() => {
  window.addEventListener('popstate', restoreFromLocation)
  restoreFromLocation()
  void loadResources()
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', restoreFromLocation)
  resetAutosaveQueue()
})

watch(selectedResourceKey, (value) => {
  if (value) void reloadDetail()
})

async function loadResources() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await listRecoveryResources()
    if (!result.success || !result.data) throw result
    resources.value = result.data
  } catch (error) {
    errorText.value = toUserFacingRecoveryError(error)
  } finally {
    loading.value = false
  }
}

function selectResource(resource: BrokenResourceSummary) {
  selectedResourceKey.value = resource.resourceKey
  history.pushState(null, '', `/maintenance/recovery/${encodeURIComponent(resource.resourceKey)}`)
}

function returnToList() {
  resetAutosaveQueue()
  selectedResourceKey.value = ''
  detail.value = null
  draftSnapshot.value = null
  sourceView.value = null
  validation.value = null
  validationInvalidated.value = false
  history.pushState(null, '', '/maintenance/recovery')
  void loadResources()
}

function restoreFromLocation() {
  const match = /^\/maintenance\/recovery\/([^/]+)/.exec(window.location.pathname)
  selectedResourceKey.value = match ? decodeURIComponent(match[1]) : ''
}

async function reloadDetail() {
  if (!selectedResourceKey.value) return
  resetAutosaveQueue()
  detailLoading.value = true
  errorText.value = ''
  sourceView.value = null
  sourceError.value = false
  validation.value = null
  validationInvalidated.value = false
  try {
    const result = await getRecoveryResource(selectedResourceKey.value)
    if (!result.success || !result.data) throw result
    detail.value = result.data
    draftSnapshot.value = result.data.draft
  } catch (error) {
    errorText.value = toUserFacingRecoveryError(error)
  } finally {
    detailLoading.value = false
  }
}

async function createDraft() {
  if (!selectedResourceKey.value) return
  resetAutosaveQueue()
  draftLoading.value = true
  try {
    const result = await createRecoveryDraft(selectedResourceKey.value)
    if (!result.success || !result.data) throw result
    draftSnapshot.value = result.data
    autosaveState.value = 'saved'
  } catch (error) {
    errorText.value = toUserFacingRecoveryError(error)
  } finally {
    draftLoading.value = false
  }
}

function updateField(fieldPath: string, change: FieldChange) {
  const draft = activeDraft.value
  if (!draft) return
  draft.fields = draft.fields.map((field) => field.fieldPath === fieldPath
    ? { fieldPath, state: 'confirmed', source: 'user', value: change.value }
    : field)
  validationInvalidated.value = validation.value !== null
  scheduleAutosave()
}

function scheduleAutosave() {
  if (autosaveInFlight) {
    autosavePending = true
    return
  }
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    void saveDraft()
  }, 450)
}

async function saveDraft() {
  if (!selectedResourceKey.value) return
  if (autosaveInFlight) {
    autosavePending = true
    return
  }
  const draft = activeDraft.value
  if (!draft) return
  const fields = cloneRecoveryFields(draft.fields)
  autosaveInFlight = true
  autosaveState.value = 'saving'
  try {
    const result = await updateRecoveryDraft(selectedResourceKey.value, {
      expectedDraftRevision: draft.draftRevision,
      fields,
    })
    if (!result.success || !result.data) throw result
    draftSnapshot.value = autosavePending && activeDraft.value
      ? {
          ...result.data,
          draft: result.data.draft
            ? { ...result.data.draft, fields: activeDraft.value.fields }
            : result.data.draft,
        }
      : result.data
    autosaveState.value = 'saved'
  } catch (error) {
    autosaveState.value = firstAfErrorCode(error) === 'RECOVERY_DRAFT_CONFLICT' ? 'conflict' : 'failed'
    if (autosaveState.value === 'conflict') void reloadDetail()
  } finally {
    autosaveInFlight = false
    if (autosavePending && autosaveState.value === 'saved') {
      autosavePending = false
      void saveDraft()
    }
  }
}

function cloneRecoveryFields(fields: RecoveryField[]): RecoveryField[] {
  return JSON.parse(JSON.stringify(fields)) as RecoveryField[]
}

function resetAutosaveQueue() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = null
  autosaveInFlight = false
  autosavePending = false
}

async function discardDraft() {
  if (!selectedResourceKey.value) return
  resetAutosaveQueue()
  draftLoading.value = true
  try {
    const result = await deleteRecoveryDraft(selectedResourceKey.value)
    if (!result.success || !result.data) throw result
    draftSnapshot.value = result.data
    validation.value = null
    validationInvalidated.value = false
    discardDialogOpen.value = false
  } catch (error) {
    errorText.value = toUserFacingRecoveryError(error)
  } finally {
    draftLoading.value = false
  }
}

async function validateDraft() {
  if (!selectedResourceKey.value) return
  validating.value = true
  try {
    const result = await validateRecoveryDraft(selectedResourceKey.value)
    if (!result.success || !result.data) throw result
    validation.value = result.data
    validationInvalidated.value = false
  } catch (error) {
    errorText.value = toUserFacingRecoveryError(error)
  } finally {
    validating.value = false
  }
}

async function commitDraft() {
  if (!selectedResourceKey.value || !detail.value || !activeDraft.value) return
  committing.value = true
  try {
    const result = await commitRecoveryDraft(selectedResourceKey.value, {
      expectedSourceRevision: detail.value.inspection.revision,
      expectedDraftRevision: activeDraft.value.draftRevision,
    })
    if (!result.success || !result.data) throw result
    confirmCommitOpen.value = false
    if (result.data.reflection.succeeded) {
      emit('message', { type: 'success', text: '修復が完了しました。' })
      returnToList()
      return
    }
    emit('message', { type: 'warning', text: '保存済み・反映失敗。修復内容は保存されましたが、アプリへの反映を完了できませんでした。' })
  } catch (error) {
    const code = firstAfErrorCode(error)
    const message = toUserFacingRecoveryError(error)
    errorText.value = message
    if (code === 'RECOVERY_WRITE_CONFLICT') {
      confirmCommitOpen.value = false
      validationInvalidated.value = true
      return
    }
    if (code === 'RECOVERY_DRAFT_CONFLICT') {
      confirmCommitOpen.value = false
      await reloadDetail()
      errorText.value = message
    }
  } finally {
    committing.value = false
  }
}

async function loadSource() {
  if (!selectedResourceKey.value) return
  sourceLoading.value = true
  sourceError.value = false
  try {
    const result = await getRecoverySource(selectedResourceKey.value)
    if (!result.success || !result.data) throw result
    sourceView.value = result.data
  } catch {
    sourceError.value = true
  } finally {
    sourceLoading.value = false
  }
}

function displayPath(path: string) {
  return path.replace(/^data\//, '')
}

function resourceTypeLabel(type: ResourceType) {
  if (type === 'WORKOUT') return 'ワークアウト'
  if (type === 'MACHINE_MASTER') return 'マシン'
  return 'ジム'
}

function issueSummary(issues: ResourceIssue[]) {
  const broken = issues.filter((issue) => issue.severity === 'broken').length
  const warning = issues.length - broken
  return warning > 0 ? `${broken}件の問題、${warning}件の確認事項` : `${broken}件の問題`
}

function issueTitle(issue: ResourceIssue) {
  const field = issue.location?.fieldPath ? fieldLabel(issue.location.fieldPath) : ''
  if (issue.code === 'RECOVERY_FIELD_UNRESOLVED') return `${field || '項目'}の入力が必要です`
  if (issue.code.includes('DUPLICATE')) return '同じIDのデータがあります'
  if (issue.severity === 'warning') return '利用できますが確認事項があります'
  return field ? `${field}を確認できません` : 'このデータを確認できません'
}

function issueContext(issue: ResourceIssue) {
  const parts = [
    issue.location?.sessionId ? `対象: ${issue.location.sessionId}` : '',
    issue.location?.fieldPath ? `項目: ${fieldLabel(issue.location.fieldPath)}` : '',
    issue.location?.line ? `行: ${issue.location.line}` : '',
  ].filter(Boolean)
  return parts.join(' / ') || '対象: このデータ'
}

function fieldLabel(path: string) {
  const key = path.split('/').filter(Boolean).at(-1) ?? path
  return {
    schema_version: '形式バージョン',
    session_id: '記録ID',
    date: '日付',
    status: '状態',
    gym_id: 'ジムID',
    condition: 'コンディション',
    machines: 'マシン',
    notes: 'メモ',
  }[key] ?? key
}

function firstAfErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('errors' in error)) return null
  return (error as { errors?: AfError[] }).errors?.[0]?.code ?? null
}

function toUserFacingRecoveryError(error: unknown) {
  const code = firstAfErrorCode(error)
  const messages: Record<string, string> = {
    RECOVERY_RESOURCE_NOT_FOUND: '修復対象が見つかりません。最新の状態を確認してください。',
    RECOVERY_RESOURCE_NOT_BROKEN: 'このデータは現在、修復対象ではありません。',
    RECOVERY_UNAVAILABLE: 'この環境では修復機能を利用できません。',
    RECOVERY_SOURCE_UNAVAILABLE: '元データの表示は利用できません。',
    RECOVERY_SOURCE_VIEW_TOO_LARGE: '元データの表示は利用できません。',
    RECOVERY_DRAFT_REQUIRED: '下書きが必要です。',
    RECOVERY_DRAFT_CONFLICT: '別の変更が反映されたため、下書きを更新できませんでした。最新の状態を確認してください。',
    RECOVERY_DRAFT_STALE: '元データが更新されています。最新の状態から修復をやり直してください。',
    RECOVERY_DRAFT_INCOMPATIBLE: 'この下書きは現在のバージョンでは使用できません。',
    RECOVERY_DRAFT_CORRUPTED: '下書きを読み込めません。',
    RECOVERY_DRAFT_SAVE_FAILED: '下書きを保存できませんでした。',
    RECOVERY_VALIDATION_FAILED: 'まだ修復できない項目があります。',
    RECOVERY_WRITE_CONFLICT: '元データが更新されたため、この内容では修復を確定できません。再読み込みで最新状態を確認し、必要な場合は下書きを作り直してください。',
    RECOVERY_WRITE_FAILED: '修復内容を保存できませんでした。時間をおいて再度実行してください。',
    RECOVERY_REFLECTION_FAILED: '保存済み・反映失敗。修復内容は保存されましたが、アプリへの反映を完了できませんでした。',
    GITHUB_UNAUTHORIZED: 'GitHub Tokenを確認してください。',
    GITHUB_FORBIDDEN: 'GitHub Tokenを確認してください。',
    GITHUB_TIMEOUT: 'GitHubとの通信に失敗しました。時間をおいて再度実行してください。',
    GITHUB_CONNECTION_FAILED: 'GitHubとの通信に失敗しました。時間をおいて再度実行してください。',
    GITHUB_RATE_LIMIT: 'GitHubの制限に達しました。時間をおいて再度実行してください。',
    GITHUB_SERVER_ERROR: 'GitHubとの通信に失敗しました。時間をおいて再度実行してください。',
  }
  return code ? messages[code] ?? '修復操作を完了できませんでした。' : '修復操作を完了できませんでした。'
}

</script>

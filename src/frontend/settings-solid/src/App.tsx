import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import {
  initializeAppNavigation,
  pageTransitionClassName,
  getAfStatus,
  getConfiguration,
  getCredentialStatus,
  syncWorkoutData,
  updateConfiguration,
  updateCredential,
  type AfConfiguration,
  type AfError,
  type AfStatus,
  type CredentialStatus,
  type ResourceConfiguration,
  type TimeoutConfiguration,
} from '@workout-lab/frontend-common'
import { initializeCharacterEasterEgg } from '@workout-lab/frontend-common/easter-egg'
import type { JSX } from 'solid-js'
import {
  credentialExpiryPresets,
  describeCredentialExpiry,
  formatCredentialDisplayDate,
  inferCredentialExpiryPreset,
  resolveCredentialLimitDate,
  type CredentialExpiryPreset,
} from './credential-expiry'
import {
  buildSetupSteps,
  isSetupReady,
  type SetupStep,
} from './setup-assistant'

const resourceTypes = ['WORKOUT', 'MACHINE_MASTER', 'GYM_MASTER'] as const
const resourceKinds = ['file', 'directory'] as const
const statusLabels: Record<string, string> = {
  available: '利用可能',
  completed: '完了',
  degraded: '一部利用不可',
  expired: '期限切れ',
  failed: '失敗',
  idle: '待機中',
  invalid: '無効',
  loading: '読込中',
  missing: '未設定',
  ready: '利用可能',
  running: '実行中',
  starting: '起動中',
  stopping: '終了中',
  unconfigured: '初期設定未完了',
  unavailable: '利用不可',
  unknown: '不明',
}
const resourceTypeLabels: Record<ResourceConfiguration['type'], string> = {
  WORKOUT: 'WORKOUT / ワークアウト情報',
  MACHINE_MASTER: 'MACHINE_MASTER / 種目マスター',
  GYM_MASTER: 'GYM_MASTER / ジムマスター',
}
type Message = {
  tone: 'success' | 'warning' | 'error'
  text: string
}

function App() {
  const [status, setStatus] = createSignal<AfStatus | null>(null)
  const [credential, setCredential] = createSignal<CredentialStatus | null>(null)
  const [repository, setRepository] = createSignal({
    owner: '',
    repository: '',
    ref: 'main',
    rootPath: '',
  })
  const [resources, setResources] = createSignal<ResourceConfiguration[]>([])
  const [timeouts, setTimeouts] = createSignal<TimeoutConfiguration>({
    githubRequestTimeoutSec: 10,
    syncOperationTimeoutSec: 60,
    generalApiTimeoutSec: 30,
    shutdownTimeoutSec: 10,
  })
  const [token, setToken] = createSignal('')
  const [limitDate, setLimitDate] = createSignal('')
  const [expiryPreset, setExpiryPreset] = createSignal<CredentialExpiryPreset>('30')
  const [loading, setLoading] = createSignal(true)
  const [busy, setBusy] = createSignal<string | null>(null)
  const [message, setMessage] = createSignal<Message | null>(null)
  let shellElement: HTMLElement | undefined
  let characterTriggerElement: HTMLParagraphElement | undefined

  const canOperate = createMemo(() => !loading() && busy() === null)
  const expiryDescription = createMemo(() => describeCredentialExpiry(credential()))
  const setupSteps = createMemo(() => buildSetupSteps({
    status: status(),
    credential: credential(),
    repository: repository(),
    resources: resources(),
  }))

  onMount(() => {
    const navigation = initializeAppNavigation({
      currentRouteId: 'settings',
      shell: shellElement,
    })
    const characterEasterEgg = initializeCharacterEasterEgg({
      trigger: characterTriggerElement,
      host: document.body,
      assetBasePath: '/frontend-common/easter-egg/assets/',
    })
    onCleanup(() => {
      navigation.dispose()
      characterEasterEgg.dispose()
    })

    void refresh()
  })

  async function refresh() {
    setLoading(true)
    setMessage(null)
    try {
      const [statusResult, configurationResult, credentialResult] = await Promise.all([
        getAfStatus(),
        getConfiguration(),
        getCredentialStatus(),
      ])

      if (statusResult.data) setStatus(statusResult.data)
      if (configurationResult.data) applyConfiguration(configurationResult.data)
      if (credentialResult.data) applyCredential(credentialResult.data)

      const errors = [
        ...statusResult.errors,
        ...configurationResult.errors,
        ...credentialResult.errors,
      ]
      if (!statusResult.success || !configurationResult.success || !credentialResult.success) {
        setMessage(toMessage('error', errors, '設定を読み込めませんでした。'))
      } else if (errors.length > 0) {
        setMessage(toMessage('warning', errors, '設定を読み込みました。確認が必要です。'))
      }
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : '設定を読み込めませんでした。',
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveRepository() {
    await runOperation('repository', async () => {
      const result = await updateConfiguration({ repository: repository() })
      if (result.data) {
        const tone = result.success && result.errors.length === 0 ? 'success' : 'warning'
        setMessage(toMessage(tone, result.errors, result.data.remoteChecked ? 'リポジトリ設定を保存し、接続を確認しました。' : 'リポジトリ設定を保存しました。'))
      } else {
        setMessage(toMessage('error', result.errors, 'リポジトリ設定を保存できませんでした。'))
      }
      await refreshStatusOnly()
    })
  }

  async function saveResources() {
    await runOperation('resources', async () => {
      const result = await updateConfiguration({ resources: resources() })
      setMessage(result.success
        ? toMessage(result.errors.length > 0 ? 'warning' : 'success', result.errors, 'リソース設定を保存しました。')
        : toMessage('error', result.errors, 'リソース設定を保存できませんでした。'))
      await refreshStatusOnly()
    })
  }

  async function saveTimeouts() {
    await runOperation('timeouts', async () => {
      const result = await updateConfiguration({ timeouts: timeouts() })
      setMessage(result.success
        ? toMessage(result.errors.length > 0 ? 'warning' : 'success', result.errors, 'タイムアウト設定を保存しました。')
        : toMessage('error', result.errors, 'タイムアウト設定を保存できませんでした。'))
      await refreshStatusOnly()
    })
  }

  async function saveCredential() {
    await runOperation('credential', async () => {
      const nextToken = token().trim()
      const nextLimitDate = limitDate().trim()
      const result = await updateCredential({
        token: nextToken.length > 0 ? nextToken : null,
        limitDate: nextLimitDate.length > 0 ? nextLimitDate : resolveCredentialLimitDate(expiryPreset(), limitDate()),
      })

      setToken('')
      if (result.data) applyCredential(result.data)
      setMessage(result.success
        ? toMessage(result.errors.length > 0 ? 'warning' : 'success', result.errors, '資格情報を更新しました。')
        : toMessage('error', result.errors, '資格情報を更新できませんでした。'))
      await refreshStatusOnly()
    })
  }

  async function syncNow() {
    await runOperation('sync', async () => {
      const result = await syncWorkoutData()
      setMessage(result.success
        ? toMessage(result.errors.length > 0 ? 'warning' : 'success', result.errors, result.data?.degraded ? '同期が完了しました。確認が必要です。' : '同期が完了しました。')
        : toMessage('error', result.errors, '同期に失敗しました。'))
      await refreshStatusOnly()
    })
  }

  async function runOperation(name: string, operation: () => Promise<void>) {
    if (!canOperate()) return
    setBusy(name)
    setMessage(null)
    try {
      await operation()
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : '操作に失敗しました。',
      })
    } finally {
      setBusy(null)
      scrollToTop()
    }
  }

  async function refreshStatusOnly() {
    const [nextStatus, nextCredential] = await Promise.all([
      getAfStatus(),
      getCredentialStatus(),
    ])
    if (nextStatus.data) setStatus(nextStatus.data)
    if (nextCredential.data) applyCredential(nextCredential.data)
  }

  function applyConfiguration(configuration: AfConfiguration) {
    setRepository(configuration.repository)
    setResources(configuration.resources)
    setTimeouts(configuration.timeouts)
  }

  function applyCredential(next: CredentialStatus) {
    setCredential(next)
    setLimitDate(next.limitDate ?? '')
    setExpiryPreset(inferCredentialExpiryPreset(next.limitDate))
  }

  function updateExpiryPreset(value: CredentialExpiryPreset) {
    setExpiryPreset(value)
    if (value !== 'custom') {
      setLimitDate(resolveCredentialLimitDate(value, limitDate()))
    }
  }

  function updateResource(index: number, patch: Partial<ResourceConfiguration>) {
    setResources((current) => current.map((resource, itemIndex) => (
      itemIndex === index ? { ...resource, ...patch } : resource
    )))
  }

  function addResource() {
    setResources((current) => [
      ...current,
      {
        type: 'WORKOUT',
        path: '',
        resourceKind: 'directory',
        required: true,
        emptyAllowed: false,
      },
    ])
  }

  function removeResource(index: number) {
    setResources((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <main ref={shellElement} class={`app-shell settings-shell ${pageTransitionClassName}`} aria-busy={loading() || busy() !== null}>
      <Show when={loading() || busy() !== null}>
        <Portal>
          <div class="operation-overlay" role="status" aria-live="polite" aria-label="処理中">
            <div class="circular-loader" aria-hidden="true" />
          </div>
        </Portal>
      </Show>

      <header class="page-hero">
        <div class="hero-top">
          <div class="atl-brand-row" aria-label="Atlament Settings">
            <p ref={characterTriggerElement} class="eyebrow atl-character-trigger">Atlament / Application Settings</p>
          </div>
        </div>
        <h1>Application Settings</h1>
        <p class="lead">アプリケーションを設定する<br />接続先や同期など、アプリケーションの動作を設定します</p>
      </header>

      <Show when={message()}>
        {(current) => <section class={`message ${current().tone}`}>{current().text}</section>}
      </Show>

      <section class="settings-grid">
        <SetupAssistant
          status={status()}
          steps={setupSteps()}
        />

        <StatusSection status={status()} credential={credential()} />

        <section class="panel repository-panel">
          <div class="panel-header">
            <div class="card-heading">
              <div class="card-heading__icon"><i class="mdi mdi-source-repository" aria-hidden="true" /></div>
              <div class="card-heading__text">
                <p class="eyebrow">GitHub Repository Source</p>
                <h2>リポジトリ接続情報</h2>
              </div>
            </div>
            <button class="primary-action" type="button" disabled={!canOperate()} onClick={saveRepository}>
              Save
            </button>
          </div>
          <div class="form-grid two">
            <Field label="Owner">
              <input value={repository().owner} onInput={(event) => setRepository({ ...repository(), owner: event.currentTarget.value })} />
            </Field>
            <Field label="Repository">
              <input value={repository().repository} onInput={(event) => setRepository({ ...repository(), repository: event.currentTarget.value })} />
            </Field>
            <Field label="Branch">
              <input value={repository().ref} onInput={(event) => setRepository({ ...repository(), ref: event.currentTarget.value })} />
            </Field>
            <Field label="Data Root">
              <input value={repository().rootPath} onInput={(event) => setRepository({ ...repository(), rootPath: event.currentTarget.value })} />
            </Field>
          </div>
        </section>

        <section class="panel wide-panel">
          <div class="panel-header">
            <div class="card-heading">
              <div class="card-heading__icon"><i class="mdi mdi-database-outline" aria-hidden="true" /></div>
              <div class="card-heading__text">
                <p class="eyebrow">Resource Data</p>
                <h2>リソース情報</h2>
              </div>
            </div>
            <div class="button-row">
              <button class="secondary-action" type="button" disabled={!canOperate()} onClick={addResource}>Add</button>
              <button class="primary-action compact" type="button" disabled={!canOperate()} onClick={saveResources}>Save</button>
            </div>
          </div>
          <div class="resource-list">
            <For each={resources()}>
              {(resource, index) => (
                <article class="resource-row">
                  <Field label="Resource Type">
                    <select value={resource.type} onChange={(event) => updateResource(index(), { type: event.currentTarget.value as ResourceConfiguration['type'] })}>
                      <For each={resourceTypes}>{(type) => <option value={type}>{resourceTypeLabels[type]}</option>}</For>
                    </select>
                  </Field>
                  <Field label="Path">
                    <input value={resource.path} onInput={(event) => updateResource(index(), { path: event.currentTarget.value })} />
                  </Field>
                  <Field label="Data Type">
                    <select value={resource.resourceKind} onChange={(event) => updateResource(index(), { resourceKind: event.currentTarget.value as ResourceConfiguration['resourceKind'] })}>
                      <For each={resourceKinds}>{(kind) => <option value={kind}>{kind}</option>}</For>
                    </select>
                  </Field>
                  <label class="check-field">
                    <input type="checkbox" checked={resource.required} onChange={(event) => updateResource(index(), { required: event.currentTarget.checked })} />
                    Required
                  </label>
                  <label class="check-field">
                    <input type="checkbox" checked={resource.emptyAllowed} onChange={(event) => updateResource(index(), { emptyAllowed: event.currentTarget.checked })} />
                    Nullable
                  </label>
                  <button class="icon-action" type="button" aria-label="Remove resource" title="Remove resource" disabled={!canOperate()} onClick={() => removeResource(index())}>
                    <span class="mdi mdi-delete" aria-hidden="true" />
                  </button>
                </article>
              )}
            </For>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div class="card-heading">
              <div class="card-heading__icon"><i class="mdi mdi-timer-outline" aria-hidden="true" /></div>
              <div class="card-heading__text">
                <p class="eyebrow">Timeout Limits</p>
                <h2>タイムアウト設定</h2>
              </div>
            </div>
            <button class="primary-action" type="button" disabled={!canOperate()} onClick={saveTimeouts}>Save</button>
          </div>
          <div class="form-grid two">
            <NumberField label="GitHub Request" description="GitHub通信" min={1} max={120} value={timeouts().githubRequestTimeoutSec} onInput={(value) => setTimeouts({ ...timeouts(), githubRequestTimeoutSec: value })} />
            <NumberField label="Sync Operation" description="同期処理" min={5} max={600} value={timeouts().syncOperationTimeoutSec} onInput={(value) => setTimeouts({ ...timeouts(), syncOperationTimeoutSec: value })} />
            <NumberField label="General API" description="API通信" min={1} max={120} value={timeouts().generalApiTimeoutSec} onInput={(value) => setTimeouts({ ...timeouts(), generalApiTimeoutSec: value })} />
            <NumberField label="Shutdown" description="終了処理" min={1} max={60} value={timeouts().shutdownTimeoutSec} onInput={(value) => setTimeouts({ ...timeouts(), shutdownTimeoutSec: value })} />
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div class="card-heading">
              <div class="card-heading__icon"><i class="mdi mdi-key-outline" aria-hidden="true" /></div>
              <div class="card-heading__text">
                <p class="eyebrow">Credential - GitHub Token</p>
                <h2>資格情報 - GitHub Token</h2>
              </div>
            </div>
            <span class={`status-pill ${credential()?.state ?? 'unknown'}`}>{displayStatus(credential()?.state ?? 'unknown')}</span>
          </div>
          <div class="credential-state">
            <span class="mdi mdi-lock" aria-hidden="true" />
            <strong>{credential()?.configured ? '設定済み' : '未設定'}</strong>
            <span>登録された情報は、システム内に保存されます。</span>
          </div>
          <div class={`credential-expiry ${expiryDescription().state}`}>
            <span>{expiryDescription().label}</span>
            <strong>{formatCredentialDisplayDate(credential()?.limitDate)}</strong>
            <p>{expiryDescription().detail}</p>
          </div>
          <div class="form-grid">
            <Field label="GitHub Token">
              <input type="password" autocomplete="new-password" value={token()} onInput={(event) => setToken(event.currentTarget.value)} />
            </Field>
            <Field label="Token Limit">
              <select value={expiryPreset()} onChange={(event) => updateExpiryPreset(event.currentTarget.value as CredentialExpiryPreset)}>
                <For each={credentialExpiryPresets}>
                  {(preset) => <option value={preset.value}>{preset.label}</option>}
                </For>
              </select>
            </Field>
            <Show when={expiryPreset() === 'custom'}>
              <Field label="Custom Limit Date">
                <input type="date" value={limitDate()} onInput={(event) => setLimitDate(event.currentTarget.value)} />
              </Field>
            </Show>
          </div>
          <button class="primary-action" type="button" disabled={!canOperate()} onClick={saveCredential}>Update</button>
        </section>

        <section class="panel operations-panel">
          <div class="panel-header">
            <div class="card-heading">
              <div class="card-heading__icon"><i class="mdi mdi-cloud-sync-outline" aria-hidden="true" /></div>
              <div class="card-heading__text">
                <p class="eyebrow">Operations - Remote Data Sync</p>
                <h2>リモートデータ同期</h2>
              </div>
            </div>
            <button class="primary-action" type="button" disabled={!canOperate() || busy() === 'sync'} onClick={syncNow}>
              Sync immediately
            </button>
          </div>
          <p class="muted">GitHubから最新データを取得します。</p>
        </section>
      </section>
    </main>
  )
}

function SetupAssistant(props: {
  status: AfStatus | null
  steps: SetupStep[]
}) {
  const ready = createMemo(() => isSetupReady(props.status))
  const readiness = createMemo(() => props.status?.readiness)

  return (
    <section class={`panel wide-panel setup-panel ${ready() ? 'ready' : 'active'}`}>
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-progress-check" aria-hidden="true" /></div>
          <div class="card-heading__text">
            <p class="eyebrow">Initial Setup</p>
            <h2>セットアップ</h2>
          </div>
        </div>
        <span class={`status-pill ${readiness()?.state ?? 'unknown'}`}>{displayStatus(readiness()?.state)}</span>
      </div>
      <div class="setup-summary">
        <strong>Status: {ready() ? 'Finish' : 'Not Finish'}</strong>
      </div>
      <div class="setup-steps">
        <For each={props.steps}>
          {(step) => (
            <article class={`setup-step ${step.state}`}>
              <div class="setup-step__status" aria-hidden="true">
                <i class={`mdi ${step.state === 'complete' ? 'mdi-check' : step.state === 'current' ? 'mdi-arrow-right' : 'mdi-lock-outline'}`} />
              </div>
              <div class="setup-step__body">
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
            </article>
          )}
        </For>
      </div>
      <Show when={(readiness()?.requiredActions.length ?? 0) > 0}>
        <div class="required-actions">
          <p class="eyebrow">Required Actions</p>
          <For each={readiness()?.requiredActions ?? []}>{(action) => <span>{requiredActionLabel(action)}</span>}</For>
        </div>
      </Show>
    </section>
  )
}

function StatusSection(props: { status: AfStatus | null; credential: CredentialStatus | null }) {
  const githubStatus = createMemo(() => resolveGithubStatus(props.status, props.credential))

  return (
    <section class="panel wide-panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-information-outline" aria-hidden="true" /></div>
          <div class="card-heading__text">
            <p class="eyebrow">Application Framework Status</p>
            <h2>アプリケーション状況</h2>
          </div>
        </div>
      </div>
      <div class="status-grid">
        <StatusItem label="Application Framework Version" value={props.status?.versions?.applicationFramework ?? '-'} />
        <StatusItem label="Frontend Framework Version" value={props.status?.versions?.frontendFramework ?? '-'} />
        <StatusItem label="Build Variant" value={buildIdentitySummary(props.status)} />
        <StatusItem label="Application State" value={displayStatus(props.status?.readiness?.state)} />
        <StatusItem label="Synced Data" value={runtimeDataSummary(props.status)} />
        <StatusItem label="GitHub" value={githubStatus().label} />
      </div>
    </section>
  )
}

function StatusItem(props: { label: string; value: string }) {
  return (
    <div class="status-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <label class="field">
      {props.label}
      {props.children}
    </label>
  )
}

function NumberField(props: { label: string; description: string; min: number; max: number; value: number; onInput: (value: number) => void }) {
  return (
    <Field label={`${props.label} (${props.min}-${props.max} sec) / ${props.description}`}>
      <input
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onInput={(event) => props.onInput(Number(event.currentTarget.value))}
      />
    </Field>
  )
}

function toMessage(tone: Message['tone'], errors: AfError[], fallback: string): Message {
  const userFacingErrors = uniqueMessages(errors.map(toUserFacingAfError))
  return {
    tone,
    text: userFacingErrors.length === 0
      ? fallback
      : tone === 'warning'
        ? `${fallback} ${userFacingErrors.join(' / ')}`
        : userFacingErrors.join(' / '),
  }
}

function uniqueMessages(messages: string[]): string[] {
  return Array.from(new Set(messages))
}

function toUserFacingAfError(error: AfError): string {
  if (error.code === 'CONFIG_SAVE_FAILED') {
    return '設定情報を保存できませんでした。再度操作してください。'
  }
  if (error.code === 'CONFIG_REQUIRED') {
    return error.message === 'Repository configuration is required.'
      ? 'リポジトリ設定が完了していません。設定内容を確認してください。'
      : '必要な設定を行ってから、再度操作してください。'
  }
  if (error.code === 'CONFIG_INVALID') {
    if (error.message === 'Repository configuration is invalid.') {
      return 'リポジトリ設定に問題があります。入力内容を確認してください。'
    }
    if (error.message === 'Resource configuration is invalid.') {
      return 'リソース設定に問題があります。入力内容を確認してください。'
    }
    if (error.message === 'Resource configuration is required.') {
      return 'リソース設定が完了していません。設定内容を確認してください。'
    }
    if (error.message === 'Timeout configuration is required.') {
      return 'タイムアウト設定が完了していません。設定内容を確認してください。'
    }
    if (error.message.endsWith(' is out of range.')) {
      return 'タイムアウト設定の値が設定可能な範囲外です。入力内容を確認してください。'
    }
    return '設定情報が利用できない形式です。仕様を確認し、登録されている情報を見直してください。'
  }
  if (error.code === 'CREDENTIAL_REQUIRED') {
    return 'GitHub Tokenを登録してから、再度操作してください。'
  }
  if (error.code === 'CREDENTIAL_INVALID') {
    return 'GitHub Tokenが正しくありません。入力内容を確認してください。'
  }
  if (error.code === 'CREDENTIAL_SAVE_FAILED') {
    return 'GitHub Tokenを保存できませんでした。再度操作してください。'
  }
  if (error.code === 'OPERATION_ALREADY_RUNNING') {
    if (error.message === 'Sync is already running.') {
      return '同期処理を実行中です。完了してから再度操作してください。'
    }
    if (error.message === 'Credential update is already running.') {
      return 'GitHub Tokenの更新処理を実行中です。完了してから再度操作してください。'
    }
    return '設定情報の更新処理を実行中です。完了してから再度操作してください。'
  }
  if (error.code === 'COMMON_INTERNAL_ERROR') {
    return error.message === 'Sync failed.'
      ? '同期に失敗しました。再度操作してください。'
      : '設定情報を更新できませんでした。再度操作してください。'
  }
  if (error.code === 'RUNTIME_DATA_UPDATE_FAILED' || error.code === 'RUNTIME_DATA_SAVE_FAILED') {
    return '同期したデータを更新できませんでした。再度同期してください。'
  }
  if (error.code === 'RUNTIME_DATA_EMPTY') {
    return 'ワークアウトデータがありません。'
  }
  if (error.code === 'RUNTIME_DATA_INVALID') {
    return '同期対象のデータに問題があるため、同期できませんでした。'
  }
  if (error.code === 'RUNTIME_DATA_UNAVAILABLE') {
    return '同期済みデータがありません。同期してください。'
  }
  if (error.code === 'GITHUB_UNAUTHORIZED') {
    return 'GitHubの認証に失敗しました。GitHub Tokenを確認してください。'
  }
  if (error.code === 'GITHUB_FORBIDDEN') {
    return 'GitHubへのアクセスが許可されていません。リポジトリの権限とGitHub Tokenを確認してください。'
  }
  if (error.code === 'GITHUB_RESOURCE_NOT_FOUND') {
    return '同期対象のGitHubリソースが見つかりません。設定情報と同期対象を確認してください。'
  }
  if (error.code === 'GITHUB_RATE_LIMIT') {
    return 'GitHubの利用制限に達しました。時間をおいて再度操作してください。'
  }
  if (error.code === 'GITHUB_TIMEOUT') {
    return 'GitHubへの接続がタイムアウトしました。再度操作してください。タイムアウト秒数の再設定を検討してください。'
  }
  if (error.code === 'GITHUB_CONNECTION_FAILED') {
    return error.message.startsWith('GitHub server error:')
      ? 'GitHubでエラーが発生しました。時間をおいて再度操作してください。'
      : 'GitHubに接続できませんでした。ネットワーク接続を確認してください。'
  }
  if (error.code === 'GITHUB_SERVER_ERROR') {
    return 'GitHubでエラーが発生しました。時間をおいて再度操作してください。'
  }
  return fallbackAfErrorMessage(error)
}

function fallbackAfErrorMessage(error: AfError): string {
  if (error.recoverable) return '操作に失敗しました。再度操作してください。'
  return '同期対象のデータに問題があります。'
}

function displayStatus(value?: string) {
  if (!value) return '-'
  return statusLabels[value] ?? value
}

function requiredActionLabel(action: string) {
  if (action === 'CONFIGURATION_REQUIRED') return '設定情報の登録が必要です'
  if (action === 'CREDENTIAL_REQUIRED') return 'GitHub Tokenの登録が必要です'
  if (action === 'RUNTIME_DATA_REQUIRED') return 'データ同期が必要です'
  return action
}

function runtimeDataSummary(status: AfStatus | null) {
  if (!status) return '-'
  return status.runtimeData.currentAvailable ? '利用可能' : '利用不可'
}

function buildIdentitySummary(status: AfStatus | null) {
  const build = status?.versions?.build
  if (!build) return '-'
  return build.debug ? `${build.variant} / 開発用` : `${build.variant} / 通常版`
}

function resolveGithubStatus(status: AfStatus | null, credential: CredentialStatus | null) {
  if (!credential) return { label: '-' }
  if (!credential.configured || credential.state === 'missing') return { label: '未設定' }
  if (credential.state === 'expired') return { label: 'Token期限切れ' }
  if (credential.state !== 'available') return { label: '利用不可' }

  const github = status?.components.github
  if (github === 'available') return { label: '利用可能' }
  if (github === 'degraded' || github === 'unavailable' || github === 'failed') return { label: '利用不可' }
  return { label: displayStatus(github) }
}

function scrollToTop() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

export default App


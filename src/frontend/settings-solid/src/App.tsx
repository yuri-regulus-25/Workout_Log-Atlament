import { For, Show, createMemo, createSignal, onMount } from 'solid-js'
import {
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
import type { JSX } from 'solid-js'

const resourceTypes = ['WORKOUT', 'EXERCISE_MASTER', 'GYM_MASTER'] as const
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
  unavailable: '利用不可',
  unknown: '不明',
}
const requiredActionLabels: Record<string, string> = {
  CONFIGURATION_REQUIRED: '設定が必要',
  CREDENTIAL_REQUIRED: '資格情報が必要',
}
const resourceTypeLabels: Record<ResourceConfiguration['type'], string> = {
  WORKOUT: 'WORKOUT / ワークアウト情報',
  EXERCISE_MASTER: 'EXERCISE_MASTER / 種目マスタデータ',
  GYM_MASTER: 'GYM_MASTER / ジムマスタデータ',
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
  const [loading, setLoading] = createSignal(true)
  const [busy, setBusy] = createSignal<string | null>(null)
  const [message, setMessage] = createSignal<Message | null>(null)

  const canOperate = createMemo(() => !loading() && busy() === null)

  onMount(() => {
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
        limitDate: nextLimitDate.length > 0 ? nextLimitDate : null,
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
    <main class="app-shell settings-shell">
      <header class="page-hero">
        <div class="hero-top">
          <p class="eyebrow">Atlament / Application Settings</p>
          <nav class="global-nav" aria-label="Global navigation">
            <a href="/">Portal</a>
            <a href="/dashboard/">Dashboard</a>
            <a href="/workouts/">Workouts</a>
            <a href="/analytics/">Analytics</a>
            <a class="active" href="/settings/">Settings</a>
          </nav>
        </div>
        <h1>Application Settings</h1>
        <p class="lead">外の世界との繋がりを定める<br />この世界も、様々な世界と繋がっている</p>
      </header>

      <Show when={message()}>
        {(current) => <section class={`message ${current().tone}`}>{current().text}</section>}
      </Show>

      <section class="settings-grid">
        <StatusSection status={status()} loading={loading()} />

        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">GitHub Repository Source</p>
              <h2>リポジトリ接続情報</h2>
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
            <div>
              <p class="eyebrow">RESOURCE DATA</p>
              <h2>リソース情報</h2>
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
                    Allow Empty
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
            <div>
              <p class="eyebrow">TIMEOUT LIMITS</p>
              <h2>タイムアウト設定</h2>
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
            <div>
              <p class="eyebrow">CREDENTIAL - GITHUB TOKEN</p>
              <h2>資格情報 - GitHub Token</h2>
            </div>
            <span class={`status-pill ${credential()?.state ?? 'unknown'}`}>{displayStatus(credential()?.state ?? 'unknown')}</span>
          </div>
          <div class="credential-state">
            <span class="mdi mdi-lock" aria-hidden="true" />
            <strong>{credential()?.configured ? '設定済み' : '未設定'}</strong>
            <span>登録された情報は、システム内に保存されます。</span>
          </div>
          <div class="form-grid">
            <Field label="GitHub Token">
              <input type="password" autocomplete="new-password" value={token()} onInput={(event) => setToken(event.currentTarget.value)} />
            </Field>
            <Field label="Token Limit Date">
              <input type="date" value={limitDate()} onInput={(event) => setLimitDate(event.currentTarget.value)} />
            </Field>
          </div>
          <button class="primary-action" type="button" disabled={!canOperate()} onClick={saveCredential}>更新</button>
        </section>

        <section class="panel operations-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">OPERATIONS - REMOTE DATA SYNC</p>
              <h2>運用 - リモートデータ同期</h2>
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

function StatusSection(props: { status: AfStatus | null; loading: boolean }) {
  return (
    <section class="panel wide-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Application Framework Status</p>
          <h2>アプリケーション状況</h2>
        </div>
        <span class={`status-pill ${props.status?.application.status ?? 'unknown'}`}>
          {props.loading ? displayStatus('loading') : displayStatus(props.status?.application.status ?? 'unknown')}
        </span>
      </div>
      <div class="status-grid">
        <StatusItem label="Version" value={props.status?.version ?? '-'} />
        <StatusItem label="Application" value={displayStatus(props.status?.application.status)} />
        <StatusItem label="Runtime Data" value={displayStatus(props.status?.components.runtimeData)} />
        <StatusItem label="GitHub" value={displayStatus(props.status?.components.github)} />
        <StatusItem label="Credential" value={displayStatus(props.status?.components.credential)} />
        <StatusItem label="Configuration" value={displayStatus(props.status?.components.configuration)} />
      </div>
      <div class="subsection-grid">
        <StatusGroup title="Operations" entries={props.status?.operations} />
        <StatusGroup title="Hosting" entries={props.status?.components.hosting} />
      </div>
      <Show when={(props.status?.requiredActions.length ?? 0) > 0}>
        <div class="required-actions">
          <p class="eyebrow">Required Actions</p>
          <For each={props.status?.requiredActions ?? []}>{(action) => <span>{displayRequiredAction(action)}</span>}</For>
        </div>
      </Show>
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

function StatusGroup(props: { title: string; entries?: Record<string, string> }) {
  return (
    <div class="status-group">
      <p class="eyebrow">{props.title}</p>
      <For each={Object.entries(props.entries ?? {})}>
        {([key, value]) => (
          <div>
            <span>{splitCamel(key)}</span>
            <strong>{displayStatus(value)}</strong>
          </div>
        )}
      </For>
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
  return {
    tone,
    text: errors.length > 0 ? `${fallback} ${errors.map((error) => `${error.code}: ${error.message}`).join(' / ')}` : fallback,
  }
}

function splitCamel(value: string) {
  return value.replace(/[A-Z]/g, (match) => ` ${match}`).trim()
}

function displayStatus(value?: string) {
  if (!value) return '-'
  return statusLabels[value] ?? value
}

function displayRequiredAction(value: string) {
  return `${value} / ${requiredActionLabels[value] ?? '対応が必要'}`
}

export default App

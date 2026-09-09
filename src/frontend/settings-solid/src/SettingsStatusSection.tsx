import { createMemo } from 'solid-js'
import type { AfStatus, CredentialStatus } from '@workout-lab/frontend-common'
import {
  buildIdentitySummary,
  displayStatus,
  resolveGithubStatus,
  runtimeDataSummary,
} from './settings-status-presentation'

export function SettingsStatusSection(props: { status: AfStatus | null; credential: CredentialStatus | null }) {
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

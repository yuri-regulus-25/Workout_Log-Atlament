import { For, Show, createMemo } from 'solid-js'
import type { AfStatus } from '@workout-lab/frontend-common'
import { isSetupReady, type SetupStep } from './setup-assistant'
import { displayStatus, requiredActionLabel } from './settings-status-presentation'

export function SettingsSetupAssistant(props: {
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

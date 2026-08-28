import type { AfStatus, CredentialStatus, RepositoryConfiguration, ResourceConfiguration } from '@workout-lab/frontend-common'

export type SetupStepState = 'complete' | 'current' | 'blocked'

export type SetupStep = {
  id: 'repository' | 'credential' | 'resources' | 'validation'
  label: string
  detail: string
  state: SetupStepState
  actionLabel: string
  action: 'repository' | 'credential' | 'resources' | 'sync'
}

const requiredResourceTargets = [
  { type: 'WORKOUT', path: 'workouts/', resourceKind: 'directory' },
  { type: 'MACHINE_MASTER', path: 'master/machines.json', resourceKind: 'file' },
  { type: 'GYM_MASTER', path: 'master/gyms.json', resourceKind: 'file' },
] as const

export function isRepositoryConfigured(repository: RepositoryConfiguration): boolean {
  return repository.owner.trim().length > 0 &&
    repository.repository.trim().length > 0 &&
    repository.ref.trim().length > 0
}

export function isCredentialReady(credential: CredentialStatus | null): boolean {
  return credential?.configured === true && credential.state === 'available'
}

export function areRequiredResourcesConfigured(resources: ResourceConfiguration[]): boolean {
  const configured = new Set(
    resources
      .filter((resource) => resource.path.trim().length > 0)
      .map((resource) => `${resource.type}:${normalizeResourcePath(resource.path)}:${resource.resourceKind}`),
  )

  return requiredResourceTargets.every((target) => configured.has(`${target.type}:${target.path}:${target.resourceKind}`))
}

export function buildSetupSteps(input: {
  status: AfStatus | null
  credential: CredentialStatus | null
  repository: RepositoryConfiguration
  resources: ResourceConfiguration[]
}): SetupStep[] {
  const repositoryReady = isRepositoryConfigured(input.repository)
  const credentialReady = isCredentialReady(input.credential)
  const resourcesReady = areRequiredResourcesConfigured(input.resources)
  const validationReady = input.status?.readiness.state === 'ready'

  return [
    {
      id: 'repository',
      label: 'Repository',
      detail: repositoryReady ? repositorySummary(input.repository) : 'Owner、Repository、Branchを設定してください。',
      state: stateFor(repositoryReady, true),
      actionLabel: repositoryReady ? 'Check' : 'Save',
      action: 'repository',
    },
    {
      id: 'credential',
      label: 'Credential',
      detail: credentialReady ? 'GitHub Tokenは利用可能です。' : credentialDetail(input.credential),
      state: stateFor(credentialReady, repositoryReady),
      actionLabel: credentialReady ? 'Update' : 'Save',
      action: 'credential',
    },
    {
      id: 'resources',
      label: 'Data Sources',
      detail: resourcesReady ? 'Workout、Machine Master、Gym Masterの参照先が設定済みです。' : '必須データの参照先を設定してください。',
      state: stateFor(resourcesReady, repositoryReady && credentialReady),
      actionLabel: resourcesReady ? 'Check' : 'Save',
      action: 'resources',
    },
    {
      id: 'validation',
      label: 'Validation',
      detail: validationReady ? 'ReadinessはREADYです。' : validationDetail(input.status),
      state: stateFor(validationReady, repositoryReady && credentialReady && resourcesReady),
      actionLabel: 'Sync',
      action: 'sync',
    },
  ]
}

export function isSetupReady(status: AfStatus | null): boolean {
  return status?.readiness.state === 'ready'
}

function stateFor(complete: boolean, available: boolean): SetupStepState {
  if (complete) return 'complete'
  return available ? 'current' : 'blocked'
}

function normalizeResourcePath(path: string): string {
  return path.trim().replace(/\\/g, '/')
}

function repositorySummary(repository: RepositoryConfiguration): string {
  return `${repository.owner}/${repository.repository}@${repository.ref}`
}

function credentialDetail(credential: CredentialStatus | null): string {
  if (!credential || !credential.configured || credential.state === 'missing') return 'GitHub Tokenを登録してください。'
  if (credential.state === 'expired') return 'GitHub Tokenの期限を更新してください。'
  if (credential.state === 'invalid') return 'GitHub Tokenを確認してください。'
  return 'GitHub Tokenの状態を確認してください。'
}

function validationDetail(status: AfStatus | null): string {
  const actions = status?.readiness.requiredActions ?? []
  if (actions.includes('RUNTIME_DATA_REQUIRED')) return '同期を実行し、必須データを検証してください。'
  if ((status?.readiness.degradedComponents ?? []).includes('github')) return 'GitHub接続結果を確認してください。'
  return '設定保存または同期後にReadinessを確認してください。'
}

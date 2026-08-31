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
      label: 'リポジトリ情報',
      detail: repositoryReady ? 'リポジトリ情報は登録されています' : '利用するリポジトリ情報を登録してください',
      state: stateFor(repositoryReady, true),
      actionLabel: repositoryReady ? 'Check' : 'Save',
      action: 'repository',
    },
    {
      id: 'credential',
      label: 'GitHub Token',
      detail: credentialReady ? 'トークン情報は登録されています' : credentialDetail(input.credential),
      state: stateFor(credentialReady, repositoryReady),
      actionLabel: credentialReady ? 'Update' : 'Save',
      action: 'credential',
    },
    {
      id: 'resources',
      label: 'リソース',
      detail: resourcesReady ? '各種リソースは設定されています' : '各種リソースを設定してください',
      state: stateFor(resourcesReady, repositoryReady && credentialReady),
      actionLabel: resourcesReady ? 'Check' : 'Save',
      action: 'resources',
    },
    {
      id: 'validation',
      label: 'データ同期',
      detail: validationReady ? 'GitHubからデータ取得しました' : validationDetail(input.status),
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

function credentialDetail(credential: CredentialStatus | null): string {
  if (!credential || !credential.configured || credential.state === 'missing') return 'トークン情報を登録してください'
  if (credential.state === 'expired') return 'トークン情報を登録してください'
  if (credential.state === 'invalid') return 'トークン情報を登録してください'
  return 'トークン情報を登録してください'
}

function validationDetail(status: AfStatus | null): string {
  const actions = status?.readiness.requiredActions ?? []
  if (actions.includes('RUNTIME_DATA_REQUIRED')) return 'GitHubからデータを取得してください'
  if ((status?.readiness.degradedComponents ?? []).includes('github')) return 'GitHubからデータを取得してください'
  return 'GitHubからデータを取得してください'
}

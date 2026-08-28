export * from './navigation'
export * from './page-transition'

export type AfError = {
  code: string
  message: string
  recoverable: boolean
}

export type AfResponse<T> = {
  success: boolean
  errors: AfError[]
  data: T | null
}

export type AfCallResult<T> = AfResponse<T> & {
  httpStatus: number
}

export type AfStatus = {
  versions: {
    applicationFramework: string
    frontendFramework: string
    nativePackages: {
      windows: {
        version: string
      }
      android: {
        versionName: string
        versionCode: number
      }
    }
  }
  application: {
    status: string
    degraded: boolean
    acceptingRequests: boolean
  }
  operations: {
    startup: string
    manualSync: string
    configurationUpdate: string
    credentialUpdate: string
    shutdown: string
  }
  components: {
    configuration: string
    credential: string
    github: string
    runtimeData: string
    hosting: {
      portal: string
      dashboard: string
      workouts: string
      machines: string
      analytics: string
      settings: string
    }
  }
  requiredActions: string[]
}

export type RepositoryConfiguration = {
  owner: string
  repository: string
  ref: string
  rootPath: string
}

export type ResourceConfiguration = {
  type: 'WORKOUT' | 'MACHINE_MASTER' | 'GYM_MASTER'
  path: string
  resourceKind: 'file' | 'directory'
  required: boolean
  emptyAllowed: boolean
}

export type TimeoutConfiguration = {
  githubRequestTimeoutSec: number
  syncOperationTimeoutSec: number
  generalApiTimeoutSec: number
  shutdownTimeoutSec: number
}

export type AfConfiguration = {
  schemaVersion: number
  repository: RepositoryConfiguration
  resources: ResourceConfiguration[]
  timeouts: TimeoutConfiguration
}

export type AfConfigurationUpdate = {
  repository?: Partial<RepositoryConfiguration>
  resources?: ResourceConfiguration[]
  timeouts?: Partial<TimeoutConfiguration>
}

export type ConfigurationUpdateResult = {
  remoteChecked: boolean
}

export type CredentialStatus = {
  configured: boolean
  state: 'available' | 'missing' | 'invalid' | 'expired' | 'unknown'
  limitDate: string | null
}

export type CredentialUpdate = {
  token: string | null
  limitDate: string | null
}

export type CredentialUpdateResult = CredentialStatus

export type MasterWriteTarget = {
  type: 'MACHINE_MASTER' | 'GYM_MASTER'
  path: string
  resourceKind: 'file'
  writeAllowed: boolean
}

export type MasterWriteSecurity = {
  configurationAvailable: boolean
  credentialConfigured: boolean
  credentialState: CredentialStatus['state']
  repositoryConfigured: boolean
  writeEnabled: boolean
  workoutLogWriteAllowed: boolean
  rawJsonWriteAllowed: boolean
  genericGitWriteAllowed: boolean
}

export type MasterWriteBoundary = {
  repository: RepositoryConfiguration
  allowedTargets: MasterWriteTarget[]
  security: MasterWriteSecurity
}

export type MasterDocumentType = 'MACHINE_MASTER' | 'GYM_MASTER'

export type MasterDocumentSnapshot = {
  type: MasterDocumentType
  path: string
  revision: string
  content: string
}

export type MasterDocumentWriteResult = {
  type: MasterDocumentType
  path: string
  revision: string
}

export type MasterWriteErrorCode =
  | 'MASTER_WRITE_INVALID'
  | 'MASTER_WRITE_CONFLICT'
  | 'MASTER_WRITE_FAILED'
  | 'GITHUB_UNAUTHORIZED'
  | 'GITHUB_FORBIDDEN'
  | 'GITHUB_RATE_LIMIT'
  | 'GITHUB_RESOURCE_NOT_FOUND'
  | 'GITHUB_CONNECTION_FAILED'
  | 'GITHUB_TIMEOUT'
  | 'GITHUB_SERVER_ERROR'

export type SyncResult = {
  degraded: boolean
}

export async function getAfStatus(): Promise<AfCallResult<AfStatus>> {
  return callAf<AfStatus>('/api/v1/common/status')
}

export async function getConfiguration(): Promise<AfCallResult<AfConfiguration>> {
  return callAf<AfConfiguration>('/api/v1/common/configuration')
}

export async function updateConfiguration(
  configuration: AfConfigurationUpdate,
): Promise<AfCallResult<ConfigurationUpdateResult>> {
  return callAf<ConfigurationUpdateResult>('/api/v1/common/configuration', {
    method: 'POST',
    body: JSON.stringify(configuration),
  })
}

export async function getCredentialStatus(): Promise<AfCallResult<CredentialStatus>> {
  return callAf<CredentialStatus>('/api/v1/common/credential/status')
}

export async function getMasterWriteBoundary(): Promise<AfCallResult<MasterWriteBoundary>> {
  return callAf<MasterWriteBoundary>('/api/v1/common/master-write/boundary')
}

export async function updateCredential(
  credential: CredentialUpdate,
): Promise<AfCallResult<CredentialUpdateResult>> {
  return callAf<CredentialUpdateResult>('/api/v1/common/credential', {
    method: 'POST',
    body: JSON.stringify(credential),
  })
}

export async function syncWorkoutData(): Promise<AfCallResult<SyncResult>> {
  return callAf<SyncResult>('/api/v1/common/sync', { method: 'POST' })
}

async function callAf<T>(path: string, init?: RequestInit): Promise<AfCallResult<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const payload = (await response.json()) as AfResponse<T>

  return {
    ...payload,
    httpStatus: response.status,
  }
}

export * from './navigation'
export * from './page-transition'

export type AfError = {
  code: string
  message: string
  recoverable: boolean
}

export type RuntimeWarning = {
  code: 'MASTER_REFERENCE_MISSING' | 'MASTER_REFERENCE_DELETED'
  referenceKind: 'gym' | 'machine'
  resolutionState: 'missing' | 'deleted'
  originalId: string
  resolvedId: string | null
  sessionId: string
  filePath?: string
  line?: number | null
  message: string
}

export type AfResponse<T> = {
  success: boolean
  errors: AfError[]
  warnings?: RuntimeWarning[]
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
  readiness: ApplicationReadiness
  runtimeData: RuntimeDataStatusFacts
  recovery?: RecoveryStatusFacts
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
      maintenance: string
    }
  }
  requiredActions: string[]
}

export type ApplicationReadinessState = 'unconfigured' | 'ready' | 'degraded' | 'unavailable'

export type ApplicationReadiness = {
  state: ApplicationReadinessState
  requiredActions: string[]
  unavailableComponents: string[]
  degradedComponents: string[]
}

export type RuntimeDataStatusFacts = {
  currentAvailable: boolean
  currentGeneratedAt: string | null
  latestRemoteRetrieval: 'unknown' | 'succeeded' | 'failed' | 'skipped'
  latestValidation: 'unknown' | 'succeeded' | 'failed' | 'skipped'
  fallbackActive: boolean
  quarantinedWorkoutResourceCount?: number
}

export type RecoveryStatusFacts = {
  brokenResourceCount: number
  brokenWorkoutResourceCount: number
  brokenMasterResourceCount: number
  recoverableResourceCount: number
  activeDraftCount: number
}

export type ApplicationRecoveryAction = 'open-settings' | 'complete-setup' | 'update-credential' | 'retry-sync' | 'reload'

export type ApplicationAccessPolicy = {
  state: ApplicationReadinessState
  normalApplicationsAvailable: boolean
  settingsAvailable: boolean
  setupAvailable: boolean
  recoveryActions: ApplicationRecoveryAction[]
  restrictedComponents: string[]
  fallbackActive: boolean
}

export function deriveApplicationReadiness(status: Pick<AfStatus, 'application' | 'components' | 'requiredActions'>): ApplicationReadiness {
  const requiredActions = Array.from(new Set(status.requiredActions)).sort()
  const unavailableComponents = [
    status.components.configuration === 'unavailable' ? 'configuration' : '',
    status.components.credential === 'unavailable' ? 'credential' : '',
    status.components.runtimeData === 'unavailable' ? 'runtimeData' : '',
  ].filter(Boolean)
  const degradedComponents = [
    status.components.github === 'degraded' ? 'github' : '',
    status.components.runtimeData === 'degraded' ? 'runtimeData' : '',
  ].filter(Boolean)

  if (requiredActions.includes('CONFIGURATION_REQUIRED') || requiredActions.includes('CREDENTIAL_REQUIRED')) {
    return { state: 'unconfigured', requiredActions, unavailableComponents, degradedComponents }
  }

  if (!status.application.acceptingRequests || status.application.status === 'failed' || unavailableComponents.includes('runtimeData')) {
    return { state: 'unavailable', requiredActions, unavailableComponents, degradedComponents }
  }

  if (status.application.status === 'degraded' || degradedComponents.length > 0 || unavailableComponents.length > 0 || requiredActions.length > 0) {
    return { state: 'degraded', requiredActions, unavailableComponents, degradedComponents }
  }

  return { state: 'ready', requiredActions, unavailableComponents: [], degradedComponents: [] }
}

export function deriveApplicationAccessPolicy(
  readiness: ApplicationReadiness,
  runtimeData?: RuntimeDataStatusFacts,
): ApplicationAccessPolicy {
  const restrictedComponents = Array.from(new Set([
    ...readiness.unavailableComponents,
    ...readiness.degradedComponents,
  ])).sort()
  const fallbackActive = runtimeData?.fallbackActive ?? false

  if (readiness.state === 'unconfigured') {
    return {
      state: readiness.state,
      normalApplicationsAvailable: false,
      settingsAvailable: true,
      setupAvailable: true,
      recoveryActions: uniqueActions(['open-settings', 'complete-setup']),
      restrictedComponents,
      fallbackActive: false,
    }
  }

  if (readiness.state === 'unavailable') {
    return {
      state: readiness.state,
      normalApplicationsAvailable: false,
      settingsAvailable: true,
      setupAvailable: false,
      recoveryActions: recoveryActionsFor(readiness),
      restrictedComponents,
      fallbackActive: false,
    }
  }

  if (readiness.state === 'degraded') {
    return {
      state: readiness.state,
      normalApplicationsAvailable: true,
      settingsAvailable: true,
      setupAvailable: false,
      recoveryActions: recoveryActionsFor(readiness),
      restrictedComponents,
      fallbackActive,
    }
  }

  return {
    state: readiness.state,
    normalApplicationsAvailable: true,
    settingsAvailable: true,
    setupAvailable: false,
    recoveryActions: [],
    restrictedComponents: [],
    fallbackActive: false,
  }
}

function recoveryActionsFor(readiness: ApplicationReadiness): ApplicationRecoveryAction[] {
  const actions: ApplicationRecoveryAction[] = []
  if (readiness.requiredActions.includes('RUNTIME_DATA_REQUIRED') || readiness.unavailableComponents.includes('runtimeData')) {
    actions.push('retry-sync')
  }
  if (readiness.unavailableComponents.includes('credential')) {
    actions.push('update-credential')
  }
  if (readiness.degradedComponents.includes('github')) {
    actions.push('retry-sync')
  }
  actions.push('open-settings', 'reload')
  return uniqueActions(actions)
}

function uniqueActions(actions: ApplicationRecoveryAction[]): ApplicationRecoveryAction[] {
  return Array.from(new Set(actions))
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

export type ResourceType = 'WORKOUT' | 'MACHINE_MASTER' | 'GYM_MASTER'

export type ResourceHealth = 'healthy' | 'degraded' | 'broken'

export type ResourceIssueSeverity = 'warning' | 'broken'

export type ResourceIssueLocation = {
  line?: number | null
  recordId?: string | null
  sessionId?: string | null
  fieldPath?: string | null
}

export type ResourceIssue = {
  code: string
  severity: ResourceIssueSeverity
  message: string
  location?: ResourceIssueLocation | null
  details?: unknown
}

export type ResourceInspection = {
  path: string
  revision: string
  resourceType: ResourceType
  inspectionVersion: number
  health: ResourceHealth
  issues: ResourceIssue[]
}

export type RecoveryEligibility = {
  eligible: boolean
  reasonCode?: string | null
}

export type RecoveryCapabilities = {
  sourceView: boolean
  draft: boolean
  validate: boolean
  commit: boolean
}

export type BrokenResourceSummary = {
  resourceKey: string
  path: string
  revision: string
  resourceType: ResourceType
  health: 'broken'
  issues: ResourceIssue[]
  recoveryEligible: boolean
  hasDraft: boolean
}

export type RecoverySourceView = {
  resourceKey: string
  path: string
  revision: string
  resourceType: ResourceType
  content: string
  readOnly: true
}

export type RecoveryDraftState = 'none' | 'active' | 'stale' | 'incompatible' | 'corrupted'

export type RecoveryField =
  | {
      fieldPath: string
      state: 'unresolved'
      source: 'original' | 'suggestion'
    }
  | {
      fieldPath: string
      state: 'recovered' | 'confirmed'
      source: 'original' | 'user' | 'suggestion'
      value?: unknown
    }

export type RecoverySuggestion = {
  fieldPath: string
  suggestedValue: unknown
  message?: string
}

export type RecoveryDraft = {
  schemaVersion: 1
  sourcePath: string
  sourceRevision: string
  resourceType: ResourceType
  inspectionVersion: number
  draftRevision: number
  fields: RecoveryField[]
  suggestions: RecoverySuggestion[]
}

export type RecoveryDraftSnapshot = {
  state: RecoveryDraftState
  draft: RecoveryDraft | null
}

export type RecoveryDraftUpdate = {
  expectedDraftRevision: number
  fields: RecoveryField[]
}

export type RecoveryCommitRequest = {
  expectedSourceRevision: string
  expectedDraftRevision: number
}

export type RecoveryErrorCode =
  | 'RECOVERY_RESOURCE_NOT_FOUND'
  | 'RECOVERY_RESOURCE_NOT_BROKEN'
  | 'RECOVERY_UNAVAILABLE'
  | 'RECOVERY_SOURCE_UNAVAILABLE'
  | 'RECOVERY_SOURCE_VIEW_TOO_LARGE'
  | 'RECOVERY_SCHEMA_UNSUPPORTED'
  | 'RECOVERY_DRAFT_REQUIRED'
  | 'RECOVERY_DRAFT_CONFLICT'
  | 'RECOVERY_DRAFT_STALE'
  | 'RECOVERY_DRAFT_INCOMPATIBLE'
  | 'RECOVERY_DRAFT_CORRUPTED'
  | 'RECOVERY_DRAFT_SAVE_FAILED'
  | 'RECOVERY_VALIDATION_FAILED'
  | 'RECOVERY_WRITE_CONFLICT'
  | 'RECOVERY_WRITE_FAILED'
  | 'RECOVERY_REFLECTION_FAILED'

export type RecoveryResourceDetail = {
  resourceKey: string
  inspection: ResourceInspection
  eligibility: RecoveryEligibility
  capabilities: RecoveryCapabilities
  draft: RecoveryDraftSnapshot
}

export type RecoveryValidationResult = {
  sourceRevision: string
  draftRevision: number
  health: ResourceHealth
  issues: ResourceIssue[]
  commitAllowed: boolean
  replacementPath: string
  replacementContent?: string | null
  changeSummary: string[]
  pathChange?: { from: string; to: string } | null
}

export type RecoveryCommitResult = {
  committed: boolean
  sourcePath: string
  sourceRevision: string
  replacementPath: string
  replacementRevision: string
  commitRevision: string
  pathChange?: { from: string; to: string } | null
  reflection: {
    succeeded: boolean
    health?: ResourceHealth | null
    errors: AfError[]
    warnings: RuntimeWarning[]
  }
}

export type UnresolvedAffectedWorkout = {
  filePath: string
  line?: number | null
  message: string
}

export type UnresolvedMasterReference = {
  type: MasterDocumentType
  referenceId: string
  affectedWorkouts: UnresolvedAffectedWorkout[]
}

export type MasterDocumentWriteRequest = {
  expectedRevision: string
  content: string
}

export type MasterWriteErrorCode =
  | 'MASTER_WRITE_INVALID'
  | 'MASTER_WRITE_CONFLICT'
  | 'MASTER_SYNC_REQUIRED'
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

export async function getMasterDocument(
  type: MasterDocumentType,
): Promise<AfCallResult<MasterDocumentSnapshot>> {
  return callAf<MasterDocumentSnapshot>(`/api/v1/common/master-write/documents/${type}`)
}

export async function getUnresolvedMasterReferences(): Promise<AfCallResult<UnresolvedMasterReference[]>> {
  return callAf<UnresolvedMasterReference[]>('/api/v1/common/master-write/unresolved')
}

export async function updateMasterDocument(
  type: MasterDocumentType,
  request: MasterDocumentWriteRequest,
): Promise<AfCallResult<MasterDocumentWriteResult>> {
  return callAf<MasterDocumentWriteResult>(`/api/v1/common/master-write/documents/${type}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export async function listRecoveryResources(): Promise<AfCallResult<BrokenResourceSummary[]>> {
  return callAf<BrokenResourceSummary[]>('/api/v1/common/recovery/resources')
}

export async function getRecoveryResource(resourceKey: string): Promise<AfCallResult<RecoveryResourceDetail>> {
  return callAf<RecoveryResourceDetail>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}`)
}

export async function getRecoverySource(resourceKey: string): Promise<AfCallResult<RecoverySourceView>> {
  return callAf<RecoverySourceView>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}/source`)
}

export async function getRecoveryDraft(resourceKey: string): Promise<AfCallResult<RecoveryDraftSnapshot>> {
  return callAf<RecoveryDraftSnapshot>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}/draft`)
}

export async function createRecoveryDraft(resourceKey: string): Promise<AfCallResult<RecoveryDraftSnapshot>> {
  return callAf<RecoveryDraftSnapshot>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}/draft`, {
    method: 'POST',
  })
}

export async function updateRecoveryDraft(
  resourceKey: string,
  update: RecoveryDraftUpdate,
): Promise<AfCallResult<RecoveryDraftSnapshot>> {
  return callAf<RecoveryDraftSnapshot>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}/draft`, {
    method: 'PUT',
    body: JSON.stringify(update),
  })
}

export async function deleteRecoveryDraft(resourceKey: string): Promise<AfCallResult<RecoveryDraftSnapshot>> {
  return callAf<RecoveryDraftSnapshot>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}/draft`, {
    method: 'DELETE',
  })
}

export async function validateRecoveryDraft(resourceKey: string): Promise<AfCallResult<RecoveryValidationResult>> {
  return callAf<RecoveryValidationResult>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}/validate`, {
    method: 'POST',
  })
}

export async function commitRecoveryDraft(
  resourceKey: string,
  request: RecoveryCommitRequest,
): Promise<AfCallResult<RecoveryCommitResult>> {
  return callAf<RecoveryCommitResult>(`/api/v1/common/recovery/resources/${encodeURIComponent(resourceKey)}/commit`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
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

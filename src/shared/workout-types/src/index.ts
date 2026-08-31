export type MachineSet = {
  set: number
  weight_kg: number
  reps: number
  rir?: number | null
  failure?: boolean
  warmup?: boolean
  note?: string
}

export type BodyPart =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'glutes'
  | 'core'
  | 'cardio'
  | 'other'

export type MasterReferenceResolutionState = 'resolved' | 'missing' | 'deleted'

export type MasterReferenceKind = 'gym' | 'machine'

export type MasterReferenceResolution = {
  state: MasterReferenceResolutionState
  originalId: string
  resolvedId: string | null
}

export type RuntimeWarning = {
  code: 'MASTER_REFERENCE_MISSING' | 'MASTER_REFERENCE_DELETED'
  referenceKind: MasterReferenceKind
  resolutionState: Exclude<MasterReferenceResolutionState, 'resolved'>
  originalId: string
  resolvedId: string | null
  sessionId: string
  filePath?: string
  line?: number | null
  message: string
}

export type RawWorkoutMachine = {
  machine_id: string
  sets: MachineSet[]
  notes?: string[]
}

export type RawWorkoutSession = {
  schema_version: number
  session_id: string
  date: string
  status: WorkoutStatus
  gym_id: string
  condition?: SessionCondition
  machines: RawWorkoutMachine[]
  notes?: string[]
}

export type WorkoutMachine = {
  machine_id: string
  name?: string
  body_part?: BodyPart
  resolution?: MasterReferenceResolution
  sets: MachineSet[]
  notes?: string[]
}

export type SessionCondition = {
  fatigue?: number | null
  motivation?: number | null
  sleep?: number | null
  soreness?: string[] | null
  performance?: string | null
  notes?: string[]
}

export type Gym = {
  id: string
  name?: string
  short_name?: string
  resolution?: MasterReferenceResolution
}

export type WorkoutStatus = 'complete' | 'partial'

export type MachineMasterItem = {
  machine_id: string
  source_ids?: string[]
  name: string
  body_part: BodyPart
  aliases?: string[]
  active: boolean
  deleted: boolean
}

export type MachineMaster = {
  schema_version: number
  machines: MachineMasterItem[]
}

export type GymMasterItem = {
  gym_id: string
  source_ids?: string[]
  name: string
  short_name?: string
  active: boolean
  deleted: boolean
  main: boolean
}

export type GymMaster = {
  schema_version: number
  gyms: GymMasterItem[]
}

export type WorkoutMasterData = {
  machines: MachineMaster
  gyms: GymMaster
}

export type WorkoutSession = {
  schema_version: number
  session_id: string
  date: string
  status: WorkoutStatus
  gym: Gym
  condition?: SessionCondition
  machines: WorkoutMachine[]
  notes?: string[]
}

export type WorkoutRow = {
  sessionId: string
  date: string
  gym: string
  machineCount: number
  totalSets: number
  totalVolume: number
  machines: string
  status: string
}

export type MachineHistoryRow = {
  date: string
  gym: string
  machineId: string
  machineName: string
  bodyPart: string
  sets: number
  bestWeight: number
  bestReps: number
  volume: number
}

export type BodyPartSummary = {
  bodyPart: string
  sets: number
  volume: number
}

export type PersonalRecord = {
  machineId: string
  machineName: string
  date: string
  type: 'weight' | 'reps' | 'estimated_1rm'
  value: number
}

export type WorkoutParseIssue = {
  filePath: string
  message: string
  line?: number
  code?: string
  sessionId?: string
  fieldPath?: string
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
  location?: ResourceIssueLocation
  details?: Record<string, string | number | boolean | null>
}

export type ResourceInspection = {
  path: string
  revision: string
  resourceType: ResourceType
  inspectionVersion: number
  health: ResourceHealth
  issues: ResourceIssue[]
}

export type RecoveryDraftState =
  | 'none'
  | 'active'
  | 'stale'
  | 'incompatible'
  | 'corrupted'

export type RecoveryFieldSource = 'original' | 'user' | 'suggestion'

export type RecoveryField =
  | {
      fieldPath: string
      state: 'unresolved'
      source: Exclude<RecoveryFieldSource, 'user'>
    }
  | {
      fieldPath: string
      state: 'recovered' | 'confirmed'
      source: RecoveryFieldSource
      value: unknown
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

export type WorkoutLoadResult = {
  sessions: WorkoutSession[]
  issues: WorkoutParseIssue[]
  warnings?: RuntimeWarning[]
  masterData?: WorkoutMasterData
  inspections?: ResourceInspection[]
}

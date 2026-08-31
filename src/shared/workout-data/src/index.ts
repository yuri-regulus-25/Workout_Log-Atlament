import type {
  BodyPart,
  MachineMaster,
  MachineMasterItem,
  MachineSet,
  MasterReferenceResolution,
  RuntimeWarning,
  GymMaster,
  GymMasterItem,
  WorkoutMachine,
  WorkoutLoadResult,
  WorkoutMasterData,
  WorkoutParseIssue,
  WorkoutSession,
  WorkoutStatus,
} from '@workout-lab/workout-types'

type UnknownRecord = Record<string, unknown>

type MasterLookup = {
  machinesById: Map<string, MachineMasterItem>
  gymsById: Map<string, GymMasterItem>
}

export type WorkoutFile = {
  path: string
  content: string
}

export type WorkoutModuleMap = Record<string, unknown>

export type RuntimeWorkoutLoadOptions = {
  endpoints?: string[]
  fetcher?: typeof fetch
}

type RuntimeWorkoutFileResponse = {
  files?: WorkoutFile[]
  masterData?: WorkoutMasterData
}

type AfError = {
  code: string
  message: string
  recoverable: boolean
}

type RuntimeWorkoutApiResponse = {
  success?: boolean
  errors?: AfError[]
  warnings?: RuntimeWarning[]
  data?: {
    sessions?: WorkoutSession[]
    masterDocuments?: RuntimeMasterDocuments | null
  } | null
  masterDocuments?: RuntimeMasterDocuments | null
}

type RuntimeMasterDocuments = {
  machine?: {
    content?: string
  } | null
  gym?: {
    content?: string
  } | null
}

const defaultRuntimeWorkoutFileEndpoints = [
  '/api/v1/common/runtime/workouts',
  '/api/workout-data',
  'http://127.0.0.1:4317/api/workout-data',
]

const allowedBodyParts = new Set<BodyPart>([
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'glutes',
  'core',
  'cardio',
  'other',
])

export const sampleMachineMaster: MachineMaster = {
  schema_version: 1,
  machines: [
    { machine_id: 'abdominal', name: 'アブドミナル', body_part: 'core', aliases: [], active: true, deleted: false },
    {
      machine_id: 'shoulder-press',
      name: 'ショルダープレス',
      body_part: 'shoulders',
      aliases: [],
      active: true,
      deleted: false,
    },
    {
      machine_id: 'lat-pulldown',
      name: 'ラットプルダウン',
      body_part: 'back',
      aliases: [],
      active: true,
      deleted: false,
    },
    { machine_id: 'hack-squat', name: 'ハックスクワット', body_part: 'legs', aliases: [], active: true, deleted: false },
    {
      machine_id: 'hip-abduction',
      name: 'ヒップアブダクション',
      body_part: 'glutes',
      aliases: [],
      active: true,
      deleted: false,
    },
  ],
}

export const sampleGymMaster: GymMaster = {
  schema_version: 1,
  gyms: [
    {
      gym_id: 'af-shioiri',
      name: 'エニタイムフィットネス 横須賀汐入店',
      short_name: 'AF横須賀汐入',
      active: true,
      deleted: false,
      main: false,
    },
    {
      gym_id: 'af-akihabara',
      name: 'エニタイムフィットネス 秋葉原店',
      short_name: 'AF秋葉原',
      active: true,
      deleted: false,
      main: false,
    },
    {
      gym_id: 'af-minatomirai',
      name: 'エニタイムフィットネス みなとみらい店',
      short_name: 'AFみなとみらい',
      active: true,
      deleted: false,
      main: false,
    },
  ],
}

export const sampleMasterData: WorkoutMasterData = {
  machines: sampleMachineMaster,
  gyms: sampleGymMaster,
}

export const sampleWorkoutJson = `{
  "schema_version": 1,
  "session_id": "2026-08-14-01",
  "date": "2026-08-14",
  "status": "partial",
  "gym_id": "af-shioiri",
  "condition": {
    "fatigue": null,
    "motivation": null,
    "notes": ["PoC sample log from recoverable chat context."]
  },
  "machines": [
    {
      "machine_id": "hip-abduction",
      "sets": [
        { "set": 1, "weight_kg": 65, "reps": 10, "rir": null },
        { "set": 2, "weight_kg": 65, "reps": 10, "rir": null },
        { "set": 3, "weight_kg": 50, "reps": 10, "rir": null }
      ],
      "notes": ["All recorded sets were 10 reps."]
    }
  ],
  "notes": ["This mirrors the existing sample workout shape but uses the draft schema names."]
}`

export const sampleWorkoutJsonl = `
{"schema_version":1,"session_id":"2026-08-16-01","date":"2026-08-16","status":"complete","gym_id":"af-akihabara","condition":{"fatigue":2,"motivation":4,"notes":["Short upper body session."]},"machines":[{"machine_id":"shoulder-press","sets":[{"set":1,"weight_kg":22.5,"reps":10,"rir":2},{"set":2,"weight_kg":22.5,"reps":9,"rir":1},{"set":3,"weight_kg":20,"reps":10,"rir":1}]},{"machine_id":"lat-pulldown","sets":[{"set":1,"weight_kg":45,"reps":12,"rir":2},{"set":2,"weight_kg":45,"reps":11,"rir":1}]}],"notes":["Good tempo on shoulder press."]}
{"schema_version":1,"session_id":"2026-08-18-01","date":"2026-08-18","status":"complete","gym_id":"af-minatomirai","condition":{"fatigue":3,"motivation":5,"notes":[]},"machines":[{"machine_id":"hack-squat","sets":[{"set":1,"weight_kg":80,"reps":10,"rir":2},{"set":2,"weight_kg":90,"reps":8,"rir":1},{"set":3,"weight_kg":90,"reps":8,"rir":1}]},{"machine_id":"abdominal","sets":[{"set":1,"weight_kg":35,"reps":15,"rir":2},{"set":2,"weight_kg":35,"reps":15,"rir":2}]}],"notes":["Leg-focused day."]}
`.trim()

export function loadSampleWorkoutSessions(): WorkoutSession[] {
  return loadWorkoutSessionsFromFiles([
    { path: 'sample/2026-08-14.json', content: sampleWorkoutJson },
    { path: 'sample/2026-08-16.jsonl', content: sampleWorkoutJsonl },
  ], sampleMasterData).sessions
}

export async function loadRuntimeWorkoutSessions(
  options: RuntimeWorkoutLoadOptions = {},
): Promise<WorkoutLoadResult> {
  return fetchRuntimeWorkoutData(options)
}

async function fetchRuntimeWorkoutData({
  endpoints = defaultRuntimeWorkoutFileEndpoints,
  fetcher = fetch,
}: RuntimeWorkoutLoadOptions): Promise<WorkoutLoadResult> {
  const errors: string[] = []

  for (const endpoint of endpoints) {
    try {
      const response = await fetcher(withCacheBuster(endpoint), { cache: 'no-store' })

      if (!response.ok) {
        errors.push(`${endpoint}: HTTP ${response.status}`)
        continue
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        errors.push(`${endpoint}: expected JSON but received ${contentType || 'unknown content-type'}`)
        continue
      }

      const payload = (await response.json()) as RuntimeWorkoutFileResponse

      if (isRuntimeWorkoutApiResponse(payload)) {
        const masterDataResult = parseRuntimeMasterDocuments(payload.data.masterDocuments ?? payload.masterDocuments)
        return {
          sessions: payload.data.sessions,
          masterData: masterDataResult.masterData,
          issues: [
            ...(payload.errors ?? []).map((error) => ({
              filePath: '<af-runtime>',
              message: `${error.code}: ${error.message}`,
            })),
            ...masterDataResult.issues,
          ],
          warnings: payload.warnings ?? [],
        }
      }

      if (!Array.isArray(payload.files)) {
        errors.push(`${endpoint}: files must be an array`)
        continue
      }

      if (!isRuntimeMasterData(payload.masterData)) {
        errors.push(`${endpoint}: masterData is invalid`)
        continue
      }

      return loadWorkoutSessionsFromFiles(payload.files.filter(isWorkoutFile), payload.masterData)
    } catch (error) {
      errors.push(`${endpoint}: ${getErrorMessage(error)}`)
    }
  }

  throw new Error(`Failed to load runtime workout data. ${errors.join(' / ')}`)
}

export function loadWorkoutSessionsFromFiles(
  files: WorkoutFile[],
  masterData = sampleMasterData,
): WorkoutLoadResult {
  const result: WorkoutLoadResult = { sessions: [], issues: [], warnings: [], masterData }
  const masterLookup = createMasterLookup(masterData, result.issues)

  for (const file of files) {
    const parsed = parseWorkoutFile(file.path, file.content, masterLookup)
    result.sessions.push(...parsed.sessions)
    result.issues.push(...parsed.issues)
    result.warnings?.push(...(parsed.warnings ?? []))
  }

  result.sessions.sort((a, b) => a.date.localeCompare(b.date) || a.session_id.localeCompare(b.session_id))
  return result
}

export function loadWorkoutSessionsFromModules(
  modules: WorkoutModuleMap,
  masterData = sampleMasterData,
): WorkoutLoadResult {
  const files = Object.entries(modules).map(([path, module]) => ({
    path,
    content: moduleToContent(module),
  }))

  return loadWorkoutSessionsFromFiles(files, masterData)
}

export function parseWorkoutFile(
  path: string,
  content: string,
  masterDataOrLookup: WorkoutMasterData | MasterLookup = sampleMasterData,
): WorkoutLoadResult {
  const masterLookup = isMasterLookup(masterDataOrLookup)
    ? masterDataOrLookup
    : createMasterLookup(masterDataOrLookup)

  if (path.endsWith('.jsonl')) {
    return parseWorkoutJsonl(path, content, masterLookup)
  }

  return parseWorkoutJson(path, content, masterLookup)
}

export function parseWorkoutJson(
  path: string,
  content: string,
  masterDataOrLookup: WorkoutMasterData | MasterLookup = sampleMasterData,
): WorkoutLoadResult {
  const masterLookup = isMasterLookup(masterDataOrLookup)
    ? masterDataOrLookup
    : createMasterLookup(masterDataOrLookup)

  try {
    const parsed = JSON.parse(content) as unknown
    return normalizeWorkoutRecord(parsed, masterLookup, path)
  } catch (error) {
    return {
      sessions: [],
      issues: [{ filePath: path, message: getErrorMessage(error) }],
    }
  }
}

export function parseWorkoutJsonl(
  path: string,
  content: string,
  masterDataOrLookup: WorkoutMasterData | MasterLookup = sampleMasterData,
): WorkoutLoadResult {
  const result: WorkoutLoadResult = { sessions: [], issues: [], warnings: [] }
  const masterLookup = isMasterLookup(masterDataOrLookup)
    ? masterDataOrLookup
    : createMasterLookup(masterDataOrLookup, result.issues)

  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) {
        return
      }

      try {
        const parsed = JSON.parse(line) as unknown
        const normalized = normalizeWorkoutRecord(parsed, masterLookup, path, index + 1)
        result.sessions.push(...normalized.sessions)
        result.issues.push(...normalized.issues)
        result.warnings?.push(...(normalized.warnings ?? []))
      } catch (error) {
        result.issues.push({
          filePath: path,
          line: index + 1,
          message: getErrorMessage(error),
        })
      }
    })

  return result
}

export function normalizeWorkoutRecord(
  value: unknown,
  masterDataOrLookup: WorkoutMasterData | MasterLookup = sampleMasterData,
  filePath = '<memory>',
  line?: number,
): WorkoutLoadResult {
  const issues: WorkoutParseIssue[] = []
  const warnings: RuntimeWarning[] = []
  const masterLookup = isMasterLookup(masterDataOrLookup)
    ? masterDataOrLookup
    : createMasterLookup(masterDataOrLookup, issues)

  if (!isRecord(value)) {
    return {
      sessions: [],
      issues: [{ filePath, line, message: 'Workout session must be an object.' }],
    }
  }

  const schemaVersion = readNumber(value, 'schema_version')
  const sessionId = readString(value, 'session_id')
  const date = readString(value, 'date')
  const status = normalizeStatus(readString(value, 'status'))
  const gymId = readString(value, 'gym_id')
  const machinesValue = value['machines']

  if (schemaVersion === null) {
    issues.push({ filePath, line, message: 'Missing required numeric field: schema_version.' })
  }

  if (!sessionId) {
    issues.push({ filePath, line, message: 'Missing required string field: session_id.' })
  }

  if (!date) {
    issues.push({ filePath, line, message: 'Missing required string field: date.' })
  } else if (!isIsoDate(date)) {
    issues.push({ filePath, line, message: 'Invalid date format: expected YYYY-MM-DD.' })
  }

  if (!status) {
    issues.push({
      filePath,
      line,
      message: 'Missing or invalid required string field: status. Expected complete or partial.',
    })
  }

  if (!gymId) {
    issues.push({ filePath, line, message: 'Missing required string field: gym_id.' })
  }

  if (!Array.isArray(machinesValue)) {
    issues.push({ filePath, line, message: 'Missing required array field: machines.' })
  }

  if (
    schemaVersion === null ||
    !sessionId ||
    !date ||
    !isIsoDate(date) ||
    !status ||
    !gymId ||
    !Array.isArray(machinesValue)
  ) {
    return { sessions: [], issues }
  }

  const gym = masterLookup.gymsById.get(gymId)
  const normalizedGym = gym
    ? {
        id: gym.gym_id,
        ...(!gym.deleted ? { name: gym.name, short_name: gym.short_name } : {}),
        resolution: resolveMasterReference(gymId, gym.gym_id, gym.deleted),
      }
    : {
        id: gymId,
        resolution: resolveMasterReference(gymId, null, false),
      }
  if (!gym || gym.deleted) {
    warnings.push(createReferenceWarning({
      referenceKind: 'gym',
      originalId: gymId,
      resolvedId: gym?.gym_id ?? null,
      deleted: Boolean(gym?.deleted),
      sessionId,
      filePath,
      line,
    }))
  }

  const machineIssueCountBefore = issues.length
  const machines = machinesValue
    .map((machine, index) => normalizeMachine(machine, index, masterLookup, issues, warnings, sessionId, filePath, line))
    .filter((machine): machine is WorkoutMachine => machine !== null)
  const machineIssues = issues.slice(machineIssueCountBefore)

  if (
    status === 'complete' &&
    machines.length === 0 &&
    (machineIssues.length === 0 || !machineIssues.every(isMasterResolveIssue))
  ) {
    issues.push({
      filePath,
      line,
      message: 'Complete workout session requires at least one valid machine.',
    })
  }

  if (issues.length > 0) {
    return { sessions: [], issues }
  }

  const session: WorkoutSession = {
    schema_version: schemaVersion,
    session_id: sessionId,
    date,
    status,
    gym: normalizedGym,
    condition: normalizeCondition(value['condition'], issues, filePath, line),
    machines,
    notes: readStringArray(value, 'notes') ?? [],
  }

  return { sessions: [session], issues, warnings }
}

function isMasterResolveIssue(issue: WorkoutParseIssue): boolean {
  return issue.message.startsWith('Unknown machine_id:') || issue.message.startsWith('Unknown gym_id:')
}

function normalizeMachine(
  value: unknown,
  index: number,
  masterLookup: MasterLookup,
  issues: WorkoutParseIssue[],
  warnings: RuntimeWarning[],
  sessionId: string,
  filePath: string,
  line?: number,
): WorkoutMachine | null {
  if (!isRecord(value)) {
    issues.push({ filePath, line, message: `Machine at index ${index} must be an object.` })
    return null
  }

  const machineId = readString(value, 'machine_id')
  const setsValue = value['sets']

  if (!machineId) {
    issues.push({ filePath, line, message: `Machine at index ${index} is missing machine_id.` })
  }

  if (!Array.isArray(setsValue)) {
    issues.push({
      filePath,
      line,
      message: `Machine at index ${index} is missing required array field: sets.`,
    })
    return null
  }

  if (!machineId) {
    return null
  }

  const masterMachine = masterLookup.machinesById.get(machineId)
  if (!masterMachine || masterMachine.deleted) {
    warnings.push(createReferenceWarning({
      referenceKind: 'machine',
      originalId: machineId,
      resolvedId: masterMachine?.machine_id ?? null,
      deleted: Boolean(masterMachine?.deleted),
      sessionId,
      filePath,
      line,
    }))
  }

  if (setsValue.length === 0) {
    issues.push({
      filePath,
      line,
      message: `Machine "${machineId}" requires at least one set.`,
    })
    return null
  }

  const sets = setsValue
    .map((set, setIndex) => normalizeSet(set, setIndex, issues, filePath, line))
    .filter((set): set is MachineSet => set !== null)

  if (sets.length === 0) {
    issues.push({
      filePath,
      line,
      message: `Machine "${machineId}" has no valid sets.`,
    })
    return null
  }

  return {
    machine_id: masterMachine?.machine_id ?? machineId,
    ...(masterMachine && !masterMachine.deleted
      ? { name: masterMachine.name, body_part: masterMachine.body_part }
      : {}),
    resolution: resolveMasterReference(machineId, masterMachine?.machine_id ?? null, Boolean(masterMachine?.deleted)),
    sets,
    notes: readStringArray(value, 'notes') ?? [],
  }
}

function resolveMasterReference(
  originalId: string,
  resolvedId: string | null,
  deleted: boolean,
): MasterReferenceResolution {
  if (!resolvedId) return { state: 'missing', originalId, resolvedId: null }
  return { state: deleted ? 'deleted' : 'resolved', originalId, resolvedId }
}

function createReferenceWarning({
  referenceKind,
  originalId,
  resolvedId,
  deleted,
  sessionId,
  filePath,
  line,
}: {
  referenceKind: 'gym' | 'machine'
  originalId: string
  resolvedId: string | null
  deleted: boolean
  sessionId: string
  filePath: string
  line?: number
}): RuntimeWarning {
  const resolutionState = deleted ? 'deleted' : 'missing'
  const subject = referenceKind === 'gym' ? 'ジム' : 'マシン'
  const stateText = deleted ? '削除されています' : '存在しません'
  return {
    code: deleted ? 'MASTER_REFERENCE_DELETED' : 'MASTER_REFERENCE_MISSING',
    referenceKind,
    resolutionState,
    originalId,
    resolvedId,
    sessionId,
    filePath,
    line: line ?? null,
    message: `特定の${subject}が${stateText}: ${originalId}`,
  }
}

function normalizeSet(
  value: unknown,
  index: number,
  issues: WorkoutParseIssue[],
  filePath: string,
  line?: number,
): MachineSet | null {
  if (!isRecord(value)) {
    issues.push({ filePath, line, message: `Set at index ${index} must be an object.` })
    return null
  }

  const setNumber = readNumber(value, 'set')
  const weight = readNumber(value, 'weight_kg')
  const reps = readNumber(value, 'reps')

  if (setNumber === null || weight === null || reps === null) {
    issues.push({
      filePath,
      line,
      message: `Set at index ${index} requires numeric set, weight_kg, and reps.`,
    })
    return null
  }

  return {
    set: setNumber,
    weight_kg: weight,
    reps,
    rir: readNullableNumber(value, 'rir'),
    failure: readBoolean(value, 'failure') ?? undefined,
    warmup: readBoolean(value, 'warmup') ?? undefined,
    note: readString(value, 'note') ?? undefined,
  }
}

function normalizeCondition(
  value: unknown,
  issues: WorkoutParseIssue[],
  filePath: string,
  line?: number,
) {
  if (value === undefined) {
    return undefined
  }

  if (!isRecord(value)) {
    issues.push({ filePath, line, message: 'Optional field condition must be an object when present.' })
    return undefined
  }

  return {
    fatigue: readNullableNumber(value, 'fatigue'),
    motivation: readNullableNumber(value, 'motivation'),
    sleep: readNullableNumber(value, 'sleep'),
    soreness: readStringArray(value, 'soreness') ?? null,
    performance: readString(value, 'performance') ?? null,
    notes: readStringArray(value, 'notes') ?? [],
  }
}

export function parseMachineMaster(path: string, content: string): {
  master?: MachineMaster
  issues: WorkoutParseIssue[]
} {
  try {
    return normalizeMachineMaster(JSON.parse(content) as unknown, path)
  } catch (error) {
    return { issues: [{ filePath: path, message: getErrorMessage(error) }] }
  }
}

export function parseGymMaster(path: string, content: string): {
  master?: GymMaster
  issues: WorkoutParseIssue[]
} {
  try {
    return normalizeGymMaster(JSON.parse(content) as unknown, path)
  } catch (error) {
    return { issues: [{ filePath: path, message: getErrorMessage(error) }] }
  }
}

export function normalizeMachineMaster(
  value: unknown,
  filePath = '<memory>',
): { master?: MachineMaster; issues: WorkoutParseIssue[] } {
  const issues: WorkoutParseIssue[] = []

  if (!isRecord(value)) {
    return { issues: [{ filePath, message: 'Machine master must be an object.' }] }
  }

  const schemaVersion = readNumber(value, 'schema_version')
  const machinesValue = value['machines']

  if (schemaVersion === null) {
    issues.push({ filePath, message: 'Missing required numeric field: schema_version.' })
  }

  if (!Array.isArray(machinesValue)) {
    issues.push({ filePath, message: 'Missing required array field: machines.' })
  }

  if (schemaVersion === null || !Array.isArray(machinesValue)) {
    return { issues }
  }

  const seenIds = new Set<string>()
  const machines = machinesValue
    .map((machine, index) => normalizeMachineMasterItem(machine, index, seenIds, issues, filePath))
    .filter((machine): machine is MachineMasterItem => machine !== null)

  return issues.length === 0 ? { master: { schema_version: schemaVersion, machines }, issues } : { issues }
}

export function normalizeGymMaster(
  value: unknown,
  filePath = '<memory>',
): { master?: GymMaster; issues: WorkoutParseIssue[] } {
  const issues: WorkoutParseIssue[] = []

  if (!isRecord(value)) {
    return { issues: [{ filePath, message: 'Gym master must be an object.' }] }
  }

  const schemaVersion = readNumber(value, 'schema_version')
  const gymsValue = value['gyms']

  if (schemaVersion === null) {
    issues.push({ filePath, message: 'Missing required numeric field: schema_version.' })
  }

  if (!Array.isArray(gymsValue)) {
    issues.push({ filePath, message: 'Missing required array field: gyms.' })
  }

  if (schemaVersion === null || !Array.isArray(gymsValue)) {
    return { issues }
  }

  const seenIds = new Set<string>()
  const gyms = gymsValue
    .map((gym, index) => normalizeGymMasterItem(gym, index, seenIds, issues, filePath))
    .filter((gym): gym is GymMasterItem => gym !== null)

  return issues.length === 0 ? { master: { schema_version: schemaVersion, gyms }, issues } : { issues }
}

function normalizeMachineMasterItem(
  value: unknown,
  index: number,
  seenIds: Set<string>,
  issues: WorkoutParseIssue[],
  filePath: string,
): MachineMasterItem | null {
  if (!isRecord(value)) {
    issues.push({ filePath, message: `Machine master item at index ${index} must be an object.` })
    return null
  }

  const machineId = readString(value, 'machine_id')
  const sourceIds = readStringArray(value, 'source_ids') ?? []
  const name = readString(value, 'name')
  const bodyPart = readString(value, 'body_part')
  const aliases = readStringArray(value, 'aliases') ?? []
  const active = readBoolean(value, 'active')
  const deleted = readBoolean(value, 'deleted') ?? false

  if (!machineId) {
    issues.push({ filePath, message: `Machine master item at index ${index} is missing machine_id.` })
  }

  if (!name) {
    issues.push({ filePath, message: `Machine master item at index ${index} is missing name.` })
  }

  if (!bodyPart || !isBodyPart(bodyPart)) {
    issues.push({ filePath, message: `Machine master item at index ${index} has invalid body_part.` })
  }

  if (active === null) {
    issues.push({ filePath, message: `Machine master item at index ${index} is missing active.` })
  }

  if (machineId && seenIds.has(machineId)) {
    issues.push({ filePath, message: `Duplicate machine_id: ${machineId}.` })
  }

  if (machineId) {
    seenIds.add(machineId)
  }

  return machineId && name && bodyPart && isBodyPart(bodyPart) && active !== null
    ? { machine_id: machineId, source_ids: sourceIds, name, body_part: bodyPart, aliases, active, deleted }
    : null
}

function normalizeGymMasterItem(
  value: unknown,
  index: number,
  seenIds: Set<string>,
  issues: WorkoutParseIssue[],
  filePath: string,
): GymMasterItem | null {
  if (!isRecord(value)) {
    issues.push({ filePath, message: `Gym master item at index ${index} must be an object.` })
    return null
  }

  const gymId = readString(value, 'gym_id')
  const sourceIds = readStringArray(value, 'source_ids') ?? []
  const name = readString(value, 'name')
  const shortName = readString(value, 'short_name')
  const active = readBoolean(value, 'active')
  const deleted = readBoolean(value, 'deleted') ?? false
  const main = readBoolean(value, 'main') ?? false

  if (!gymId) {
    issues.push({ filePath, message: `Gym master item at index ${index} is missing gym_id.` })
  }

  if (!name) {
    issues.push({ filePath, message: `Gym master item at index ${index} is missing name.` })
  }

  if (active === null) {
    issues.push({ filePath, message: `Gym master item at index ${index} is missing active.` })
  }

  if (gymId && seenIds.has(gymId)) {
    issues.push({ filePath, message: `Duplicate gym_id: ${gymId}.` })
  }

  if (gymId) {
    seenIds.add(gymId)
  }

  if (!gymId || !name || active === null) {
    return null
  }

  return shortName
    ? { gym_id: gymId, source_ids: sourceIds, name, short_name: shortName, active, deleted, main }
    : { gym_id: gymId, source_ids: sourceIds, name, active, deleted, main }
}

function createMasterLookup(
  masterData: WorkoutMasterData,
  issues: WorkoutParseIssue[] = [],
): MasterLookup {
  const machineResult = normalizeMachineMaster(masterData.machines, '<master:machines>')
  const gymResult = normalizeGymMaster(masterData.gyms, '<master:gyms>')

  issues.push(...machineResult.issues, ...gymResult.issues)

  return {
    machinesById: createMachineLookup(machineResult.master?.machines ?? []),
    gymsById: createGymLookup(gymResult.master?.gyms ?? []),
  }
}

function createMachineLookup(machines: MachineMasterItem[]): Map<string, MachineMasterItem> {
  const lookup = new Map<string, MachineMasterItem>()
  for (const machine of machines) {
    lookup.set(machine.machine_id, machine)
    for (const sourceId of machine.source_ids ?? []) {
      lookup.set(sourceId, machine)
    }
  }
  return lookup
}

function createGymLookup(gyms: GymMasterItem[]): Map<string, GymMasterItem> {
  const lookup = new Map<string, GymMasterItem>()
  for (const gym of gyms) {
    lookup.set(gym.gym_id, gym)
    for (const sourceId of gym.source_ids ?? []) {
      lookup.set(sourceId, gym)
    }
  }
  return lookup
}

function isMasterLookup(value: WorkoutMasterData | MasterLookup): value is MasterLookup {
  return 'machinesById' in value && 'gymsById' in value
}

function normalizeStatus(status: string | null): WorkoutStatus | null {
  if (status === 'complete') {
    return 'complete'
  }

  if (status === 'partial') {
    return 'partial'
  }

  return null
}

function moduleToContent(module: unknown): string {
  if (typeof module === 'string') {
    return module
  }

  if (isRecord(module) && typeof module['default'] === 'string') {
    return module['default']
  }

  return JSON.stringify(module)
}

function readString(value: UnknownRecord, key: string): string | null {
  return typeof value[key] === 'string' ? value[key] : null
}

function readNumber(value: UnknownRecord, key: string): number | null {
  return typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] : null
}

function readBoolean(value: UnknownRecord, key: string): boolean | null {
  return typeof value[key] === 'boolean' ? value[key] : null
}

function readNullableNumber(value: UnknownRecord, key: string): number | null {
  return value[key] === null ? null : readNumber(value, key)
}

function readStringArray(value: UnknownRecord, key: string): string[] | null {
  return Array.isArray(value[key]) && value[key].every((item) => typeof item === 'string')
    ? value[key]
    : null
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isBodyPart(value: string): value is BodyPart {
  return allowedBodyParts.has(value as BodyPart)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown parse error.'
}

function isWorkoutFile(value: unknown): value is WorkoutFile {
  return (
    isRecord(value) &&
    typeof value['path'] === 'string' &&
    typeof value['content'] === 'string'
  )
}

function isRuntimeMasterData(value: unknown): value is WorkoutMasterData {
  return (
    isRecord(value) &&
    isRecord(value['machines']) &&
    isRecord(value['gyms'])
  )
}

function isRuntimeWorkoutApiResponse(value: unknown): value is RuntimeWorkoutApiResponse & {
  data: { sessions: WorkoutSession[] }
} {
  if (!isRecord(value)) {
    return false
  }

  const data = value['data']
  return (
    typeof value['success'] === 'boolean' &&
    Array.isArray(value['errors']) &&
    isRecord(data) &&
    Array.isArray(data['sessions'])
  )
}

function parseRuntimeMasterDocuments(masterDocuments: RuntimeWorkoutApiResponse['masterDocuments']): {
  masterData?: WorkoutMasterData
  issues: WorkoutParseIssue[]
} {
  const machineContent = masterDocuments?.machine?.content
  const gymContent = masterDocuments?.gym?.content
  if (typeof machineContent !== 'string' || typeof gymContent !== 'string') {
    return { issues: [] }
  }

  const machineResult = parseMachineMaster('<af-runtime:machine-master>', machineContent)
  const gymResult = parseGymMaster('<af-runtime:gym-master>', gymContent)

  return {
    masterData: machineResult.master && gymResult.master
      ? { machines: machineResult.master, gyms: gymResult.master }
      : undefined,
    issues: [...machineResult.issues, ...gymResult.issues],
  }
}

function withCacheBuster(endpoint: string): string {
  const separator = endpoint.includes('?') ? '&' : '?'
  return `${endpoint}${separator}t=${Date.now()}`
}

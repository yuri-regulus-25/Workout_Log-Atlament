import type {
  BodyPart,
  ExerciseMaster,
  ExerciseMasterItem,
  ExerciseSet,
  GymMaster,
  GymMasterItem,
  WorkoutExercise,
  WorkoutLoadResult,
  WorkoutMasterData,
  WorkoutParseIssue,
  WorkoutSession,
  WorkoutStatus,
} from '@workout-lab/workout-types'

type UnknownRecord = Record<string, unknown>

type MasterLookup = {
  exercisesById: Map<string, ExerciseMasterItem>
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

const defaultRuntimeWorkoutFileEndpoints = [
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

export const sampleExerciseMaster: ExerciseMaster = {
  schema_version: 1,
  exercises: [
    { exercise_id: 'abdominal', name: 'アブドミナル', body_part: 'core', aliases: [], active: true },
    {
      exercise_id: 'shoulder-press',
      name: 'ショルダープレス',
      body_part: 'shoulders',
      aliases: [],
      active: true,
    },
    {
      exercise_id: 'lat-pulldown',
      name: 'ラットプルダウン',
      body_part: 'back',
      aliases: [],
      active: true,
    },
    { exercise_id: 'hack-squat', name: 'ハックスクワット', body_part: 'legs', aliases: [], active: true },
    {
      exercise_id: 'hip-abduction',
      name: 'ヒップアブダクション',
      body_part: 'glutes',
      aliases: [],
      active: true,
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
    },
    {
      gym_id: 'af-akihabara',
      name: 'エニタイムフィットネス 秋葉原店',
      short_name: 'AF秋葉原',
      active: true,
    },
    {
      gym_id: 'af-minatomirai',
      name: 'エニタイムフィットネス みなとみらい店',
      short_name: 'AFみなとみらい',
      active: true,
    },
  ],
}

export const sampleMasterData: WorkoutMasterData = {
  exercises: sampleExerciseMaster,
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
  "exercises": [
    {
      "exercise_id": "hip-abduction",
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
{"schema_version":1,"session_id":"2026-08-16-01","date":"2026-08-16","status":"complete","gym_id":"af-akihabara","condition":{"fatigue":2,"motivation":4,"notes":["Short upper body session."]},"exercises":[{"exercise_id":"shoulder-press","sets":[{"set":1,"weight_kg":22.5,"reps":10,"rir":2},{"set":2,"weight_kg":22.5,"reps":9,"rir":1},{"set":3,"weight_kg":20,"reps":10,"rir":1}]},{"exercise_id":"lat-pulldown","sets":[{"set":1,"weight_kg":45,"reps":12,"rir":2},{"set":2,"weight_kg":45,"reps":11,"rir":1}]}],"notes":["Good tempo on shoulder press."]}
{"schema_version":1,"session_id":"2026-08-18-01","date":"2026-08-18","status":"complete","gym_id":"af-minatomirai","condition":{"fatigue":3,"motivation":5,"notes":[]},"exercises":[{"exercise_id":"hack-squat","sets":[{"set":1,"weight_kg":80,"reps":10,"rir":2},{"set":2,"weight_kg":90,"reps":8,"rir":1},{"set":3,"weight_kg":90,"reps":8,"rir":1}]},{"exercise_id":"abdominal","sets":[{"set":1,"weight_kg":35,"reps":15,"rir":2},{"set":2,"weight_kg":35,"reps":15,"rir":2}]}],"notes":["Leg-focused day."]}
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
  const { files, masterData } = await fetchRuntimeWorkoutData(options)
  return loadWorkoutSessionsFromFiles(files, masterData)
}

async function fetchRuntimeWorkoutData({
  endpoints = defaultRuntimeWorkoutFileEndpoints,
  fetcher = fetch,
}: RuntimeWorkoutLoadOptions): Promise<{ files: WorkoutFile[]; masterData: WorkoutMasterData }> {
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

      if (!Array.isArray(payload.files)) {
        errors.push(`${endpoint}: files must be an array`)
        continue
      }

      if (!isRuntimeMasterData(payload.masterData)) {
        errors.push(`${endpoint}: masterData is invalid`)
        continue
      }

      return {
        files: payload.files.filter(isWorkoutFile),
        masterData: payload.masterData,
      }
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
  const result: WorkoutLoadResult = { sessions: [], issues: [] }
  const masterLookup = createMasterLookup(masterData, result.issues)

  for (const file of files) {
    const parsed = parseWorkoutFile(file.path, file.content, masterLookup)
    result.sessions.push(...parsed.sessions)
    result.issues.push(...parsed.issues)
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
  const result: WorkoutLoadResult = { sessions: [], issues: [] }
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
  const exercisesValue = value['exercises']

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

  if (!Array.isArray(exercisesValue)) {
    issues.push({ filePath, line, message: 'Missing required array field: exercises.' })
  }

  const gym = gymId ? masterLookup.gymsById.get(gymId) : undefined

  if (gymId && !gym) {
    issues.push({ filePath, line, message: `Unknown gym_id: ${gymId}.` })
  }

  if (
    schemaVersion === null ||
    !sessionId ||
    !date ||
    !isIsoDate(date) ||
    !status ||
    !gymId ||
    !gym ||
    !Array.isArray(exercisesValue)
  ) {
    return { sessions: [], issues }
  }

  const exerciseIssueCountBefore = issues.length
  const exercises = exercisesValue
    .map((exercise, index) => normalizeExercise(exercise, index, masterLookup, issues, filePath, line))
    .filter((exercise): exercise is WorkoutExercise => exercise !== null)

  if (status === 'complete' && exercises.length === 0) {
    issues.push({
      filePath,
      line,
      message: 'Complete workout session requires at least one valid exercise.',
    })
  }

  if (issues.length > exerciseIssueCountBefore) {
    return { sessions: [], issues }
  }

  const session: WorkoutSession = {
    schema_version: schemaVersion,
    session_id: sessionId,
    date,
    status,
    gym: { id: gym.gym_id, name: gym.name, short_name: gym.short_name },
    condition: normalizeCondition(value['condition'], issues, filePath, line),
    exercises,
    notes: readStringArray(value, 'notes') ?? [],
  }

  return { sessions: [session], issues }
}

function normalizeExercise(
  value: unknown,
  index: number,
  masterLookup: MasterLookup,
  issues: WorkoutParseIssue[],
  filePath: string,
  line?: number,
): WorkoutExercise | null {
  if (!isRecord(value)) {
    issues.push({ filePath, line, message: `Exercise at index ${index} must be an object.` })
    return null
  }

  const exerciseId = readString(value, 'exercise_id')
  const setsValue = value['sets']

  if (!exerciseId) {
    issues.push({ filePath, line, message: `Exercise at index ${index} is missing exercise_id.` })
  }

  if (!Array.isArray(setsValue)) {
    issues.push({
      filePath,
      line,
      message: `Exercise at index ${index} is missing required array field: sets.`,
    })
    return null
  }

  if (!exerciseId) {
    return null
  }

  const masterExercise = masterLookup.exercisesById.get(exerciseId)

  if (!masterExercise) {
    issues.push({ filePath, line, message: `Unknown exercise_id: ${exerciseId}.` })
    return null
  }

  if (setsValue.length === 0) {
    issues.push({
      filePath,
      line,
      message: `Exercise "${exerciseId}" requires at least one set.`,
    })
    return null
  }

  const sets = setsValue
    .map((set, setIndex) => normalizeSet(set, setIndex, issues, filePath, line))
    .filter((set): set is ExerciseSet => set !== null)

  if (sets.length === 0) {
    issues.push({
      filePath,
      line,
      message: `Exercise "${exerciseId}" has no valid sets.`,
    })
    return null
  }

  return {
    exercise_id: exerciseId,
    name: masterExercise.name,
    body_part: masterExercise.body_part,
    sets,
    notes: readStringArray(value, 'notes') ?? [],
  }
}

function normalizeSet(
  value: unknown,
  index: number,
  issues: WorkoutParseIssue[],
  filePath: string,
  line?: number,
): ExerciseSet | null {
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

export function parseExerciseMaster(path: string, content: string): {
  master?: ExerciseMaster
  issues: WorkoutParseIssue[]
} {
  try {
    return normalizeExerciseMaster(JSON.parse(content) as unknown, path)
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

export function normalizeExerciseMaster(
  value: unknown,
  filePath = '<memory>',
): { master?: ExerciseMaster; issues: WorkoutParseIssue[] } {
  const issues: WorkoutParseIssue[] = []

  if (!isRecord(value)) {
    return { issues: [{ filePath, message: 'Exercise master must be an object.' }] }
  }

  const schemaVersion = readNumber(value, 'schema_version')
  const exercisesValue = value['exercises']

  if (schemaVersion === null) {
    issues.push({ filePath, message: 'Missing required numeric field: schema_version.' })
  }

  if (!Array.isArray(exercisesValue)) {
    issues.push({ filePath, message: 'Missing required array field: exercises.' })
  }

  if (schemaVersion === null || !Array.isArray(exercisesValue)) {
    return { issues }
  }

  const seenIds = new Set<string>()
  const exercises = exercisesValue
    .map((exercise, index) => normalizeExerciseMasterItem(exercise, index, seenIds, issues, filePath))
    .filter((exercise): exercise is ExerciseMasterItem => exercise !== null)

  return issues.length === 0 ? { master: { schema_version: schemaVersion, exercises }, issues } : { issues }
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

function normalizeExerciseMasterItem(
  value: unknown,
  index: number,
  seenIds: Set<string>,
  issues: WorkoutParseIssue[],
  filePath: string,
): ExerciseMasterItem | null {
  if (!isRecord(value)) {
    issues.push({ filePath, message: `Exercise master item at index ${index} must be an object.` })
    return null
  }

  const exerciseId = readString(value, 'exercise_id')
  const name = readString(value, 'name')
  const bodyPart = readString(value, 'body_part')
  const aliases = readStringArray(value, 'aliases') ?? []
  const active = readBoolean(value, 'active')

  if (!exerciseId) {
    issues.push({ filePath, message: `Exercise master item at index ${index} is missing exercise_id.` })
  }

  if (!name) {
    issues.push({ filePath, message: `Exercise master item at index ${index} is missing name.` })
  }

  if (!bodyPart || !isBodyPart(bodyPart)) {
    issues.push({ filePath, message: `Exercise master item at index ${index} has invalid body_part.` })
  }

  if (active === null) {
    issues.push({ filePath, message: `Exercise master item at index ${index} is missing active.` })
  }

  if (exerciseId && seenIds.has(exerciseId)) {
    issues.push({ filePath, message: `Duplicate exercise_id: ${exerciseId}.` })
  }

  if (exerciseId) {
    seenIds.add(exerciseId)
  }

  return exerciseId && name && bodyPart && isBodyPart(bodyPart) && active !== null
    ? { exercise_id: exerciseId, name, body_part: bodyPart, aliases, active }
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
  const name = readString(value, 'name')
  const shortName = readString(value, 'short_name')
  const active = readBoolean(value, 'active')

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
    ? { gym_id: gymId, name, short_name: shortName, active }
    : { gym_id: gymId, name, active }
}

function createMasterLookup(
  masterData: WorkoutMasterData,
  issues: WorkoutParseIssue[] = [],
): MasterLookup {
  const exerciseResult = normalizeExerciseMaster(masterData.exercises, '<master:exercises>')
  const gymResult = normalizeGymMaster(masterData.gyms, '<master:gyms>')

  issues.push(...exerciseResult.issues, ...gymResult.issues)

  return {
    exercisesById: new Map(
      (exerciseResult.master?.exercises ?? []).map((exercise) => [exercise.exercise_id, exercise]),
    ),
    gymsById: new Map((gymResult.master?.gyms ?? []).map((gym) => [gym.gym_id, gym])),
  }
}

function isMasterLookup(value: WorkoutMasterData | MasterLookup): value is MasterLookup {
  return 'exercisesById' in value && 'gymsById' in value
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
    isRecord(value['exercises']) &&
    isRecord(value['gyms'])
  )
}

function withCacheBuster(endpoint: string): string {
  const separator = endpoint.includes('?') ? '&' : '?'
  return `${endpoint}${separator}t=${Date.now()}`
}

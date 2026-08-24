export type ExerciseSet = {
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

export type RawWorkoutExercise = {
  exercise_id: string
  sets: ExerciseSet[]
  notes?: string[]
}

export type RawWorkoutSession = {
  schema_version: number
  session_id: string
  date: string
  status: WorkoutStatus
  gym_id: string
  condition?: SessionCondition
  exercises: RawWorkoutExercise[]
  notes?: string[]
}

export type WorkoutExercise = {
  exercise_id: string
  name: string
  body_part: BodyPart
  sets: ExerciseSet[]
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
  name: string
  short_name?: string
}

export type WorkoutStatus = 'complete' | 'partial'

export type ExerciseMasterItem = {
  exercise_id: string
  name: string
  body_part: BodyPart
  aliases?: string[]
  active: boolean
}

export type ExerciseMaster = {
  schema_version: number
  exercises: ExerciseMasterItem[]
}

export type GymMasterItem = {
  gym_id: string
  name: string
  short_name?: string
  active: boolean
}

export type GymMaster = {
  schema_version: number
  gyms: GymMasterItem[]
}

export type WorkoutMasterData = {
  exercises: ExerciseMaster
  gyms: GymMaster
}

export type WorkoutSession = {
  schema_version: number
  session_id: string
  date: string
  status: WorkoutStatus
  gym: Gym
  condition?: SessionCondition
  exercises: WorkoutExercise[]
  notes?: string[]
}

export type WorkoutRow = {
  sessionId: string
  date: string
  gym: string
  exerciseCount: number
  totalSets: number
  totalVolume: number
  exercises: string
  status: string
}

export type ExerciseHistoryRow = {
  date: string
  gym: string
  exerciseId: string
  exerciseName: string
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
  exerciseId: string
  exerciseName: string
  date: string
  type: 'weight' | 'reps' | 'estimated_1rm'
  value: number
}

export type WorkoutParseIssue = {
  filePath: string
  message: string
  line?: number
}

export type WorkoutLoadResult = {
  sessions: WorkoutSession[]
  issues: WorkoutParseIssue[]
}

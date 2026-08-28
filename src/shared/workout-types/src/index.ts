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
  name: string
  body_part: BodyPart
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
  name: string
  short_name?: string
}

export type WorkoutStatus = 'complete' | 'partial'

export type MachineMasterItem = {
  machine_id: string
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
}

export type WorkoutLoadResult = {
  sessions: WorkoutSession[]
  issues: WorkoutParseIssue[]
}

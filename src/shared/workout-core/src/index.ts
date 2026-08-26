import type {
  BodyPart,
  BodyPartSummary,
  ExerciseHistoryRow,
  ExerciseSet,
  PersonalRecord,
  WorkoutExercise,
  WorkoutRow,
  WorkoutSession,
  WorkoutStatus,
} from '@workout-lab/workout-types'

export function getSetVolume(set: ExerciseSet): number {
  return set.weight_kg * set.reps
}

export function getExerciseVolume(exercise: WorkoutExercise): number {
  return exercise.sets.reduce((total, set) => total + getSetVolume(set), 0)
}

export function getTotalVolume(session: WorkoutSession): number {
  return session.exercises.reduce((total, exercise) => total + getExerciseVolume(exercise), 0)
}

export function getTotalSets(session: WorkoutSession): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

export const getSessionVolume = getTotalVolume
export const getSessionSetCount = getTotalSets

export function getExerciseOptions(sessions: WorkoutSession[]): WorkoutExercise[] {
  const exercisesById = new Map<string, WorkoutExercise>()

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      exercisesById.set(exercise.exercise_id, exercise)
    }
  }

  return Array.from(exercisesById.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function getExerciseHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
): ExerciseHistoryRow[] {
  return sessions.flatMap((session) =>
    session.exercises
      .filter((exercise) => exercise.exercise_id === exerciseId)
      .map((exercise) => ({
        date: session.date,
        gym: session.gym.name,
        exerciseId: exercise.exercise_id,
        exerciseName: exercise.name,
        bodyPart: exercise.body_part,
        sets: exercise.sets.length,
        bestWeight: getBestSetValue(exercise.sets, (set) => set.weight_kg),
        bestReps: getBestSetValue(exercise.sets, (set) => set.reps),
        volume: getExerciseVolume(exercise),
      })),
  ).sort((a, b) => a.date.localeCompare(b.date))
}

export function getMaxWeight(sessions: WorkoutSession[], exerciseId: string): number {
  return Math.max(0, ...getExerciseHistory(sessions, exerciseId).map((history) => history.bestWeight))
}

export function getMaxReps(sessions: WorkoutSession[], exerciseId: string): number {
  return Math.max(0, ...getExerciseHistory(sessions, exerciseId).map((history) => history.bestReps))
}

export function getEstimated1RM(weight: number, reps: number): number {
  if (reps <= 1) {
    return weight
  }

  return Math.round(weight * (1 + reps / 30))
}

export function getRecentSessions(
  sessions: WorkoutSession[],
  days: number,
  referenceDate = sessions.at(-1)?.date,
): WorkoutSession[] {
  if (!referenceDate || days <= 0) {
    return []
  }

  const end = toUtcDate(referenceDate)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))

  return sessions.filter((session) => {
    const date = toUtcDate(session.date)
    return date >= start && date <= end
  })
}

export function getBodyPartMachineVariety(sessions: WorkoutSession[]): Array<{
  bodyPart: BodyPart
  machineCount: number
}> {
  const machinesByBodyPart = new Map<BodyPart, Set<string>>()

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const machines = machinesByBodyPart.get(exercise.body_part) ?? new Set<string>()
      machines.add(exercise.exercise_id)
      machinesByBodyPart.set(exercise.body_part, machines)
    }
  }

  return Array.from(machinesByBodyPart.entries())
    .map(([bodyPart, machines]) => ({
      bodyPart,
      machineCount: machines.size,
    }))
    .sort((a, b) => b.machineCount - a.machineCount)
}

export function getAverageSetWeight(
  sessions: WorkoutSession[],
  exerciseId: string,
): number | null {
  const weights = sessions.flatMap((session) =>
    session.exercises
      .filter((exercise) => exercise.exercise_id === exerciseId)
      .flatMap((exercise) => exercise.sets.map((set) => set.weight_kg)),
  )

  if (weights.length === 0) {
    return null
  }

  return weights.reduce((total, weight) => total + weight, 0) / weights.length
}

export function formatDisplayDate(date: string): string {
  return date.replaceAll('-', '/')
}

export function formatMachineTitleFromId(exerciseId: string): string {
  return exerciseId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatPersonalRecordType(type: PersonalRecord['type']): string {
  switch (type) {
    case 'weight':
      return '最高重量'
    case 'reps':
      return '最大回数'
    case 'estimated_1rm':
      return '推定1RM'
  }
}

export function formatPersonalRecordValue(record: PersonalRecord): string {
  switch (record.type) {
    case 'weight':
    case 'estimated_1rm':
      return `${record.value.toLocaleString()} kg`
    case 'reps':
      return `${record.value.toLocaleString()} reps`
  }
}

export function formatWeightKg(value: number): string {
  return `${value.toLocaleString()} kg`
}

export function formatTotalWeight(value: number): string {
  return `合計重量: ${formatWeightKg(value)}`
}

export function formatBodyPart(bodyPart: BodyPart | string): string {
  switch (bodyPart) {
    case 'chest':
      return '胸'
    case 'back':
      return '背中'
    case 'legs':
      return '脚'
    case 'shoulders':
      return '肩'
    case 'arms':
      return '腕'
    case 'glutes':
      return '臀部'
    case 'core':
      return '体幹'
    case 'cardio':
      return '有酸素'
    case 'other':
      return 'その他'
    default:
      return bodyPart
  }
}

export function formatWorkoutStatus(status: WorkoutStatus | string): string {
  switch (status) {
    case 'complete':
      return '記録完了'
    case 'partial':
      return '一部記録'
    default:
      return status
  }
}

export function getMonthlySessions(
  sessions: WorkoutSession[],
  year: number,
  month: number,
): WorkoutSession[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return sessions.filter((session) => session.date.startsWith(prefix))
}

export function getMonthlyVolume(sessions: WorkoutSession[], year: number, month: number): number {
  return getMonthlySessions(sessions, year, month).reduce(
    (total, session) => total + getTotalVolume(session),
    0,
  )
}

export function getBodyPartSummary(sessions: WorkoutSession[]): BodyPartSummary[] {
  const totals = new Map<string, BodyPartSummary>()

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const current = totals.get(exercise.body_part) ?? {
        bodyPart: exercise.body_part,
        sets: 0,
        volume: 0,
      }

      current.sets += exercise.sets.length
      current.volume += getExerciseVolume(exercise)
      totals.set(exercise.body_part, current)
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.volume - a.volume)
}

export function getPersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const records = new Map<string, PersonalRecord>()

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        const estimated1RM = getEstimated1RM(set.weight_kg, set.reps)
        updateRecord(records, {
          exerciseId: exercise.exercise_id,
          exerciseName: exercise.name,
          date: session.date,
          type: 'weight',
          value: set.weight_kg,
        })
        updateRecord(records, {
          exerciseId: exercise.exercise_id,
          exerciseName: exercise.name,
          date: session.date,
          type: 'reps',
          value: set.reps,
        })
        updateRecord(records, {
          exerciseId: exercise.exercise_id,
          exerciseName: exercise.name,
          date: session.date,
          type: 'estimated_1rm',
          value: estimated1RM,
        })
      }
    }
  }

  return Array.from(records.values()).sort((a, b) => b.date.localeCompare(a.date))
}

export function getTrainingStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) {
    return 0
  }

  const uniqueDates = Array.from(new Set(sessions.map((session) => session.date))).sort()
  let streak = 1

  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    const current = toUtcDate(uniqueDates[index])
    const previous = toUtcDate(uniqueDates[index - 1])
    const diffDays = (current.getTime() - previous.getTime()) / 86_400_000

    if (diffDays === 1) {
      streak += 1
    } else {
      break
    }
  }

  return streak
}

export function getAverageSessionIntervalDays(sessions: WorkoutSession[]): number | null {
  const uniqueDates = Array.from(new Set(sessions.map((session) => session.date))).sort()

  if (uniqueDates.length < 2) {
    return null
  }

  const intervals = uniqueDates.slice(1).map((date, index) => {
    const current = toUtcDate(date)
    const previous = toUtcDate(uniqueDates[index])
    return (current.getTime() - previous.getTime()) / 86_400_000
  })

  return intervals.reduce((total, days) => total + days, 0) / intervals.length
}

export function getTrainingFrequencyPerWeek(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) {
    return 0
  }

  const dates = sessions.map((session) => session.date).sort()
  const firstDate = toUtcDate(dates[0])
  const lastDate = toUtcDate(dates.at(-1) ?? dates[0])
  const inclusiveDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / 86_400_000) + 1
  const weeks = Math.max(1, inclusiveDays / 7)

  return sessions.length / weeks
}

export function toWorkoutRows(sessions: WorkoutSession[]): WorkoutRow[] {
  return sessions.map((session) => ({
    sessionId: session.session_id,
    date: session.date,
    gym: session.gym.name,
    exerciseCount: session.exercises.length,
    totalSets: getTotalSets(session),
    totalVolume: getTotalVolume(session),
    exercises: session.exercises.map((exercise) => exercise.name).join(', '),
    status: session.status,
  }))
}

function updateRecord(records: Map<string, PersonalRecord>, candidate: PersonalRecord) {
  const key = `${candidate.exerciseId}:${candidate.type}`
  const current = records.get(key)

  if (!current || candidate.value > current.value) {
    records.set(key, candidate)
  }
}

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function getBestSetValue(sets: ExerciseSet[], selectValue: (set: ExerciseSet) => number): number {
  if (sets.length === 0) {
    return 0
  }

  return Math.max(...sets.map(selectValue))
}


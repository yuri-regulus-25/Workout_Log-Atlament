import type {
  BodyPart,
  BodyPartSummary,
  MachineHistoryRow,
  MachineSet,
  PersonalRecord,
  WorkoutMachine,
  WorkoutRow,
  WorkoutSession,
  WorkoutStatus,
} from '@workout-lab/workout-types'

export function getSetVolume(set: MachineSet): number {
  return set.weight_kg * set.reps
}

export function getMachineVolume(machine: WorkoutMachine): number {
  return machine.sets.reduce((total, set) => total + getSetVolume(set), 0)
}

export function getTotalVolume(session: WorkoutSession): number {
  return session.machines.reduce((total, machine) => total + getMachineVolume(machine), 0)
}

export function getTotalSets(session: WorkoutSession): number {
  return session.machines.reduce((total, machine) => total + machine.sets.length, 0)
}

export const getSessionVolume = getTotalVolume
export const getSessionSetCount = getTotalSets

export function getMachineOptions(sessions: WorkoutSession[]): WorkoutMachine[] {
  const machinesById = new Map<string, WorkoutMachine>()

  for (const session of sessions) {
    for (const machine of session.machines) {
      machinesById.set(machine.machine_id, machine)
    }
  }

  return Array.from(machinesById.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function getMachineHistory(
  sessions: WorkoutSession[],
  machineId: string,
): MachineHistoryRow[] {
  return sessions.flatMap((session) =>
    session.machines
      .filter((machine) => machine.machine_id === machineId)
      .map((machine) => ({
        date: session.date,
        gym: session.gym.name,
        machineId: machine.machine_id,
        machineName: machine.name,
        bodyPart: machine.body_part,
        sets: machine.sets.length,
        bestWeight: getBestSetValue(machine.sets, (set) => set.weight_kg),
        bestReps: getBestSetValue(machine.sets, (set) => set.reps),
        volume: getMachineVolume(machine),
      })),
  ).sort((a, b) => a.date.localeCompare(b.date))
}

export function getMaxWeight(sessions: WorkoutSession[], machineId: string): number {
  return Math.max(0, ...getMachineHistory(sessions, machineId).map((history) => history.bestWeight))
}

export function getMaxReps(sessions: WorkoutSession[], machineId: string): number {
  return Math.max(0, ...getMachineHistory(sessions, machineId).map((history) => history.bestReps))
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
    for (const machine of session.machines) {
      const machines = machinesByBodyPart.get(machine.body_part) ?? new Set<string>()
      machines.add(machine.machine_id)
      machinesByBodyPart.set(machine.body_part, machines)
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
  machineId: string,
): number | null {
  const weights = sessions.flatMap((session) =>
    session.machines
      .filter((machine) => machine.machine_id === machineId)
      .flatMap((machine) => machine.sets.map((set) => set.weight_kg)),
  )

  if (weights.length === 0) {
    return null
  }

  return weights.reduce((total, weight) => total + weight, 0) / weights.length
}

export function formatDisplayDate(date: string): string {
  return date.replaceAll('-', '/')
}

export function formatMachineTitleFromId(machineId: string): string {
  return machineId
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

export function getCurrentLocalYearMonth(referenceDate = new Date()): { year: number; month: number } {
  return {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth() + 1,
  }
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
    for (const machine of session.machines) {
      const current = totals.get(machine.body_part) ?? {
        bodyPart: machine.body_part,
        sets: 0,
        volume: 0,
      }

      current.sets += machine.sets.length
      current.volume += getMachineVolume(machine)
      totals.set(machine.body_part, current)
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.volume - a.volume)
}

export function getPersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const records = new Map<string, PersonalRecord>()

  for (const session of sessions) {
    for (const machine of session.machines) {
      for (const set of machine.sets) {
        const estimated1RM = getEstimated1RM(set.weight_kg, set.reps)
        updateRecord(records, {
          machineId: machine.machine_id,
          machineName: machine.name,
          date: session.date,
          type: 'weight',
          value: set.weight_kg,
        })
        updateRecord(records, {
          machineId: machine.machine_id,
          machineName: machine.name,
          date: session.date,
          type: 'reps',
          value: set.reps,
        })
        updateRecord(records, {
          machineId: machine.machine_id,
          machineName: machine.name,
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
    machineCount: session.machines.length,
    totalSets: getTotalSets(session),
    totalVolume: getTotalVolume(session),
    machines: session.machines.map((machine) => machine.name).join(', '),
    status: session.status,
  }))
}

function updateRecord(records: Map<string, PersonalRecord>, candidate: PersonalRecord) {
  const key = `${candidate.machineId}:${candidate.type}`
  const current = records.get(key)

  if (!current || candidate.value > current.value) {
    records.set(key, candidate)
  }
}

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function getBestSetValue(sets: MachineSet[], selectValue: (set: MachineSet) => number): number {
  if (sets.length === 0) {
    return 0
  }

  return Math.max(...sets.map(selectValue))
}


import type {
  BodyPart,
  BodyPartSummary,
  GymMaster,
  GymMasterItem,
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

export function getTotalReps(session: WorkoutSession): number {
  return session.machines.reduce(
    (sessionTotal, machine) =>
      sessionTotal + machine.sets.reduce((machineTotal, set) => machineTotal + set.reps, 0),
    0,
  )
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

export type PeriodPreset = '7d' | '28d' | 'month' | '3m' | '6m' | 'all'

export type DateRange = {
  startDate: string
  endDate: string
}

export type PeriodComparison = {
  current: DateRange
  previous: DateRange | null
}

export type NumericDelta = {
  current: number
  previous: number
  absolute: number
  percentage: number | null
}

export type SessionAggregate = {
  sessionId: string
  date: string
  gym: string
  machineCount: number
  setCount: number
  repCount: number
}

export type DateAggregate = {
  date: string
  sessionCount: number
  machineCount: number
  setCount: number
  repCount: number
  sessions: SessionAggregate[]
}

export type WeekAggregate = {
  weekStartDate: string
  weekEndDate: string
  sessionCount: number
  machineCount: number
  setCount: number
  repCount: number
}

export type MonthAggregate = {
  month: string
  sessionCount: number
  machineCount: number
  setCount: number
  repCount: number
}

export type CalendarDayAggregate = {
  date: string
  trainingDay: boolean
  sessionCount: number
  sessions: SessionAggregate[]
}

export type WorkoutSummary = {
  sessionId: string
  date: string
  gym: string
  machineCount: number
  setCount: number
  totalReps: number
}

export type WorkoutNeighborResolution = {
  current: WorkoutSession
  previous: WorkoutSession | null
  next: WorkoutSession | null
}

export type WorkoutSessionComparison = {
  current: WorkoutSummary
  previous: WorkoutSummary
  machineCountDelta: NumericDelta
  setCountDelta: NumericDelta
  totalRepsDelta: NumericDelta
  addedMachines: Array<{ machineId: string; machineName: string }>
  removedMachines: Array<{ machineId: string; machineName: string }>
}

export type WeekdayDistribution = {
  weekday: number
  sessionCount: number
  trainingDayCount: number
}

export type MonthlyTrainingDays = {
  month: string
  trainingDayCount: number
  sessionCount: number
}

export type BodyPartSetDistribution = {
  bodyPart: BodyPart
  setCount: number
}

export type BodyPartFrequency = {
  bodyPart: BodyPart
  sessionCount: number
}

export type BodyPartShare = {
  bodyPart: BodyPart
  setCount: number
  share: number
}

export type BodyPartTrend = {
  month: string
  bodyPart: BodyPart
  setCount: number
  sessionCount: number
}

export type BodyPartLastTrained = {
  bodyPart: BodyPart
  lastTrainedDate: string
}

export type MachineFrequencyRanking = {
  machineId: string
  machineName: string
  bodyPart: BodyPart
  sessionCount: number
  occurrenceCount: number
}

export type GymSessionDistribution = {
  gymId: string
  gymName: string
  sessionCount: number
}

export type MainGymContext =
  | { state: 'configured'; gym: GymMasterItem }
  | { state: 'unconfigured' }
  | { state: 'invalid'; reason: 'multiple-main-gyms' | 'inactive-or-deleted-main-gym'; gyms: GymMasterItem[] }

export function resolvePeriodRange(
  preset: PeriodPreset,
  sessions: WorkoutSession[],
  referenceDate = sessions.at(-1)?.date ?? toIsoDate(new Date()),
): DateRange {
  if (preset === 'all') {
    const dates = sessions.map((session) => session.date).sort()
    return {
      startDate: dates[0] ?? referenceDate,
      endDate: dates.at(-1) ?? referenceDate,
    }
  }

  const endDate = toUtcDate(referenceDate)

  if (preset === 'month') {
    return getMonthRange(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1)
  }

  if (preset === '3m' || preset === '6m') {
    const monthCount = preset === '3m' ? 3 : 6
    const startDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - (monthCount - 1), 1))
    const rangeEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0))
    return {
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(rangeEnd),
    }
  }

  const days = preset === '7d' ? 7 : 28
  const startDate = new Date(endDate)
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1))

  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
  }
}

export function filterSessionsByDateRange(
  sessions: WorkoutSession[],
  range: DateRange,
): WorkoutSession[] {
  return sortSessions(
    sessions.filter((session) => session.date >= range.startDate && session.date <= range.endDate),
  )
}

export function resolvePreviousPeriod(range: DateRange): DateRange {
  const startDate = toUtcDate(range.startDate)
  const endDate = toUtcDate(range.endDate)
  const inclusiveDays = getInclusiveDayCount(range)
  const previousEnd = new Date(startDate)
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setUTCDate(previousStart.getUTCDate() - (inclusiveDays - 1))

  if (endDate < startDate) {
    return { startDate: range.startDate, endDate: range.startDate }
  }

  return {
    startDate: toIsoDate(previousStart),
    endDate: toIsoDate(previousEnd),
  }
}

export function resolvePreviousMonthRange(year: number, month: number): DateRange {
  const date = new Date(Date.UTC(year, month - 2, 1))
  return getMonthRange(date.getUTCFullYear(), date.getUTCMonth() + 1)
}

export function resolvePeriodComparison(
  preset: PeriodPreset,
  sessions: WorkoutSession[],
  referenceDate?: string,
): PeriodComparison {
  const current = resolvePeriodRange(preset, sessions, referenceDate)
  return {
    current,
    previous: preset === 'all' ? null : resolvePreviousPeriod(current),
  }
}

export function getNumericDelta(current: number, previous: number): NumericDelta {
  return {
    current,
    previous,
    absolute: current - previous,
    percentage: previous === 0 ? null : ((current - previous) / previous) * 100,
  }
}

export function getSessionAggregates(sessions: WorkoutSession[]): SessionAggregate[] {
  return sortSessions(sessions).map((session) => ({
    sessionId: session.session_id,
    date: session.date,
    gym: session.gym.name,
    machineCount: session.machines.length,
    setCount: getTotalSets(session),
    repCount: getTotalReps(session),
  }))
}

export function getDailyAggregates(sessions: WorkoutSession[]): DateAggregate[] {
  const byDate = new Map<string, SessionAggregate[]>()

  for (const session of getSessionAggregates(sessions)) {
    byDate.set(session.date, [...(byDate.get(session.date) ?? []), session])
  }

  return Array.from(byDate.entries())
    .map(([date, daySessions]) => ({
      date,
      sessionCount: daySessions.length,
      machineCount: sumAggregate(daySessions, 'machineCount'),
      setCount: sumAggregate(daySessions, 'setCount'),
      repCount: sumAggregate(daySessions, 'repCount'),
      sessions: daySessions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getWeeklyAggregates(sessions: WorkoutSession[]): WeekAggregate[] {
  const byWeek = new Map<string, WeekAggregate>()

  for (const session of getSessionAggregates(sessions)) {
    const weekStartDate = getWeekStartDate(session.date)
    const weekEnd = toUtcDate(weekStartDate)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
    const current = byWeek.get(weekStartDate) ?? {
      weekStartDate,
      weekEndDate: toIsoDate(weekEnd),
      sessionCount: 0,
      machineCount: 0,
      setCount: 0,
      repCount: 0,
    }

    current.sessionCount += 1
    current.machineCount += session.machineCount
    current.setCount += session.setCount
    current.repCount += session.repCount
    byWeek.set(weekStartDate, current)
  }

  return Array.from(byWeek.values()).sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
}

export function getMonthlyAggregates(sessions: WorkoutSession[]): MonthAggregate[] {
  const byMonth = new Map<string, MonthAggregate>()

  for (const session of getSessionAggregates(sessions)) {
    const month = session.date.slice(0, 7)
    const current = byMonth.get(month) ?? {
      month,
      sessionCount: 0,
      machineCount: 0,
      setCount: 0,
      repCount: 0,
    }

    current.sessionCount += 1
    current.machineCount += session.machineCount
    current.setCount += session.setCount
    current.repCount += session.repCount
    byMonth.set(month, current)
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function resolveCalendarMonthRange(year: number, month: number): DateRange {
  return getMonthRange(year, month)
}

export function getCalendarMonthAggregates(
  sessions: WorkoutSession[],
  year: number,
  month: number,
): CalendarDayAggregate[] {
  const range = resolveCalendarMonthRange(year, month)
  const dailyAggregates = new Map(
    getDailyAggregates(filterSessionsByDateRange(sessions, range)).map((aggregate) => [
      aggregate.date,
      aggregate,
    ]),
  )
  const days = getInclusiveDayCount(range)

  return Array.from({ length: days }, (_, index) => {
    const date = toUtcDate(range.startDate)
    date.setUTCDate(date.getUTCDate() + index)
    const isoDate = toIsoDate(date)
    const aggregate = dailyAggregates.get(isoDate)

    return {
      date: isoDate,
      trainingDay: Boolean(aggregate),
      sessionCount: aggregate?.sessionCount ?? 0,
      sessions: aggregate?.sessions ?? [],
    }
  })
}

export function getWorkoutSummary(session: WorkoutSession): WorkoutSummary {
  return {
    sessionId: session.session_id,
    date: session.date,
    gym: session.gym.name,
    machineCount: session.machines.length,
    setCount: getTotalSets(session),
    totalReps: getTotalReps(session),
  }
}

export function resolveWorkoutNeighbors(
  sessions: WorkoutSession[],
  currentSessionId: string,
): WorkoutNeighborResolution | null {
  const sorted = sortSessions(sessions)
  const currentIndex = sorted.findIndex((session) => session.session_id === currentSessionId)

  if (currentIndex === -1) {
    return null
  }

  return {
    current: sorted[currentIndex],
    previous: sorted[currentIndex - 1] ?? null,
    next: sorted[currentIndex + 1] ?? null,
  }
}

export function resolveUniqueWorkoutByDate(
  sessions: WorkoutSession[],
  date: string,
): WorkoutSession | null {
  const matches = sessions.filter((session) => session.date === date)
  return matches.length === 1 ? matches[0] : null
}

export function resolveWorkoutNeighborsByDate(
  sessions: WorkoutSession[],
  currentDate: string,
): WorkoutNeighborResolution | null {
  const current = resolveUniqueWorkoutByDate(sessions, currentDate)
  return current ? resolveWorkoutNeighbors(sessions, current.session_id) : null
}

export function compareWorkoutSessions(
  current: WorkoutSession,
  previous: WorkoutSession,
): WorkoutSessionComparison {
  const currentSummary = getWorkoutSummary(current)
  const previousSummary = getWorkoutSummary(previous)
  const currentMachines = getMachinesById(current)
  const previousMachines = getMachinesById(previous)

  return {
    current: currentSummary,
    previous: previousSummary,
    machineCountDelta: getNumericDelta(currentSummary.machineCount, previousSummary.machineCount),
    setCountDelta: getNumericDelta(currentSummary.setCount, previousSummary.setCount),
    totalRepsDelta: getNumericDelta(currentSummary.totalReps, previousSummary.totalReps),
    addedMachines: Array.from(currentMachines.entries())
      .filter(([machineId]) => !previousMachines.has(machineId))
      .map(([machineId, machine]) => ({ machineId, machineName: machine.name }))
      .sort((a, b) => a.machineName.localeCompare(b.machineName) || a.machineId.localeCompare(b.machineId)),
    removedMachines: Array.from(previousMachines.entries())
      .filter(([machineId]) => !currentMachines.has(machineId))
      .map(([machineId, machine]) => ({ machineId, machineName: machine.name }))
      .sort((a, b) => a.machineName.localeCompare(b.machineName) || a.machineId.localeCompare(b.machineId)),
  }
}

export function getWeekdayDistribution(sessions: WorkoutSession[]): WeekdayDistribution[] {
  const trainingDatesByWeekday = new Map<number, Set<string>>()
  const sessionCounts = new Map<number, number>()

  for (const session of sessions) {
    const weekday = toUtcDate(session.date).getUTCDay()
    sessionCounts.set(weekday, (sessionCounts.get(weekday) ?? 0) + 1)
    const trainingDates = trainingDatesByWeekday.get(weekday) ?? new Set<string>()
    trainingDates.add(session.date)
    trainingDatesByWeekday.set(weekday, trainingDates)
  }

  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    sessionCount: sessionCounts.get(weekday) ?? 0,
    trainingDayCount: trainingDatesByWeekday.get(weekday)?.size ?? 0,
  }))
}

export function getMonthlyTrainingDays(sessions: WorkoutSession[]): MonthlyTrainingDays[] {
  const datesByMonth = new Map<string, Set<string>>()
  const sessionsByMonth = new Map<string, number>()

  for (const session of sessions) {
    const month = session.date.slice(0, 7)
    const dates = datesByMonth.get(month) ?? new Set<string>()
    dates.add(session.date)
    datesByMonth.set(month, dates)
    sessionsByMonth.set(month, (sessionsByMonth.get(month) ?? 0) + 1)
  }

  return Array.from(datesByMonth.entries())
    .map(([month, dates]) => ({
      month,
      trainingDayCount: dates.size,
      sessionCount: sessionsByMonth.get(month) ?? 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function getSetsByBodyPart(sessions: WorkoutSession[]): BodyPartSetDistribution[] {
  const setCounts = new Map<BodyPart, number>()

  for (const session of sessions) {
    for (const machine of session.machines) {
      setCounts.set(machine.body_part, (setCounts.get(machine.body_part) ?? 0) + machine.sets.length)
    }
  }

  return sortBodyPartRows(
    Array.from(setCounts.entries()).map(([bodyPart, setCount]) => ({ bodyPart, setCount })),
  )
}

export function getBodyPartFrequency(sessions: WorkoutSession[]): BodyPartFrequency[] {
  const sessionIdsByBodyPart = new Map<BodyPart, Set<string>>()

  for (const session of sessions) {
    for (const machine of session.machines) {
      const sessionIds = sessionIdsByBodyPart.get(machine.body_part) ?? new Set<string>()
      sessionIds.add(session.session_id)
      sessionIdsByBodyPart.set(machine.body_part, sessionIds)
    }
  }

  return sortBodyPartRows(
    Array.from(sessionIdsByBodyPart.entries()).map(([bodyPart, sessionIds]) => ({
      bodyPart,
      sessionCount: sessionIds.size,
    })),
  )
}

export function getBodyPartShare(sessions: WorkoutSession[]): BodyPartShare[] {
  const sets = getSetsByBodyPart(sessions)
  const totalSets = sets.reduce((total, item) => total + item.setCount, 0)

  return sets.map((item) => ({
    ...item,
    share: totalSets === 0 ? 0 : item.setCount / totalSets,
  }))
}

export function getBodyPartTrend(sessions: WorkoutSession[]): BodyPartTrend[] {
  const trend = new Map<string, BodyPartTrend>()
  const sessionIdsByTrend = new Map<string, Set<string>>()

  for (const session of sessions) {
    const month = session.date.slice(0, 7)
    for (const machine of session.machines) {
      const key = `${month}:${machine.body_part}`
      const current = trend.get(key) ?? {
        month,
        bodyPart: machine.body_part,
        setCount: 0,
        sessionCount: 0,
      }
      const sessionIds = sessionIdsByTrend.get(key) ?? new Set<string>()

      current.setCount += machine.sets.length
      sessionIds.add(session.session_id)
      current.sessionCount = sessionIds.size
      trend.set(key, current)
      sessionIdsByTrend.set(key, sessionIds)
    }
  }

  return Array.from(trend.values()).sort(
    (a, b) => a.month.localeCompare(b.month) || a.bodyPart.localeCompare(b.bodyPart),
  )
}

export function getLastTrainedDateByBodyPart(sessions: WorkoutSession[]): BodyPartLastTrained[] {
  const lastDateByBodyPart = new Map<BodyPart, string>()

  for (const session of sessions) {
    for (const machine of session.machines) {
      const current = lastDateByBodyPart.get(machine.body_part)
      if (!current || session.date > current) {
        lastDateByBodyPart.set(machine.body_part, session.date)
      }
    }
  }

  return Array.from(lastDateByBodyPart.entries())
    .map(([bodyPart, lastTrainedDate]) => ({ bodyPart, lastTrainedDate }))
    .sort((a, b) => b.lastTrainedDate.localeCompare(a.lastTrainedDate) || a.bodyPart.localeCompare(b.bodyPart))
}

export function getMachineFrequencyRanking(sessions: WorkoutSession[]): MachineFrequencyRanking[] {
  const rows = new Map<string, MachineFrequencyRanking>()
  const sessionIdsByMachine = new Map<string, Set<string>>()

  for (const session of sessions) {
    for (const machine of session.machines) {
      const row = rows.get(machine.machine_id) ?? {
        machineId: machine.machine_id,
        machineName: machine.name,
        bodyPart: machine.body_part,
        sessionCount: 0,
        occurrenceCount: 0,
      }
      const sessionIds = sessionIdsByMachine.get(machine.machine_id) ?? new Set<string>()

      row.occurrenceCount += 1
      sessionIds.add(session.session_id)
      row.sessionCount = sessionIds.size
      rows.set(machine.machine_id, row)
      sessionIdsByMachine.set(machine.machine_id, sessionIds)
    }
  }

  return Array.from(rows.values()).sort(
    (a, b) =>
      b.sessionCount - a.sessionCount ||
      b.occurrenceCount - a.occurrenceCount ||
      a.machineName.localeCompare(b.machineName) ||
      a.machineId.localeCompare(b.machineId),
  )
}

export function getSessionsByGym(sessions: WorkoutSession[]): GymSessionDistribution[] {
  const rows = new Map<string, GymSessionDistribution>()

  for (const session of sessions) {
    const row = rows.get(session.gym.id) ?? {
      gymId: session.gym.id,
      gymName: session.gym.name,
      sessionCount: 0,
    }

    row.sessionCount += 1
    rows.set(session.gym.id, row)
  }

  return Array.from(rows.values()).sort(
    (a, b) => b.sessionCount - a.sessionCount || a.gymName.localeCompare(b.gymName) || a.gymId.localeCompare(b.gymId),
  )
}

export function resolveMainGymContext(master: GymMaster): MainGymContext {
  const mainGyms = master.gyms.filter((gym) => gym.main)

  if (mainGyms.length === 0) {
    return { state: 'unconfigured' }
  }

  if (mainGyms.length > 1) {
    return { state: 'invalid', reason: 'multiple-main-gyms', gyms: mainGyms }
  }

  const [mainGym] = mainGyms

  if (!mainGym.active || mainGym.deleted) {
    return { state: 'invalid', reason: 'inactive-or-deleted-main-gym', gyms: mainGyms }
  }

  return { state: 'configured', gym: mainGym }
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

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getMonthRange(year: number, month: number): DateRange {
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0))

  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
  }
}

function getInclusiveDayCount(range: DateRange): number {
  return Math.floor((toUtcDate(range.endDate).getTime() - toUtcDate(range.startDate).getTime()) / 86_400_000) + 1
}

function getWeekStartDate(date: string): string {
  const day = toUtcDate(date)
  const dayOfWeek = day.getUTCDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  day.setUTCDate(day.getUTCDate() + mondayOffset)
  return toIsoDate(day)
}

function sortSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.session_id.localeCompare(b.session_id))
}

function getMachinesById(session: WorkoutSession): Map<string, WorkoutMachine> {
  const machines = new Map<string, WorkoutMachine>()

  for (const machine of session.machines) {
    machines.set(machine.machine_id, machine)
  }

  return machines
}

function sortBodyPartRows<T extends { bodyPart: BodyPart }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.bodyPart.localeCompare(b.bodyPart))
}

function sumAggregate<T extends Record<K, number>, K extends keyof T>(items: T[], key: K): number {
  return items.reduce((total, item) => total + item[key], 0)
}

function getBestSetValue(sets: MachineSet[], selectValue: (set: MachineSet) => number): number {
  if (sets.length === 0) {
    return 0
  }

  return Math.max(...sets.map(selectValue))
}


import { describe, expect, it } from 'vitest'
import { loadSampleWorkoutSessions } from '@workout-lab/workout-data'
import type { WorkoutSession } from '@workout-lab/workout-types'
import {
  formatDisplayDate,
  formatBodyPart,
  formatMachineTitleFromId,
  formatPersonalRecordType,
  formatPersonalRecordValue,
  formatTotalWeight,
  formatWeightKg,
  formatWorkoutStatus,
  compareWorkoutSessions,
  getAverageSetWeight,
  getAverageSessionIntervalDays,
  getBodyPartFrequency,
  getBodyPartMachineVariety,
  getBodyPartShare,
  getBodyPartSummary,
  getBodyPartTrend,
  getCalendarMonthAggregates,
  getCurrentLocalYearMonth,
  getDailyAggregates,
  getEstimated1RM,
  getMachineHistory,
  getMonthlySessions,
  getMonthlyVolume,
  getMonthlyAggregates,
  getNumericDelta,
  getLastTrainedDateByBodyPart,
  getMachineFrequencyRanking,
  getPersonalRecords,
  getRecentSessions,
  getSessionAggregates,
  getSessionsByGym,
  getSetsByBodyPart,
  getMonthlyTrainingDays,
  getWeekdayDistribution,
  getWeeklyAggregates,
  getWorkoutSummary,
  filterSessionsByDateRange,
  resolveCalendarMonthRange,
  resolvePeriodComparison,
  resolvePeriodRange,
  resolvePreviousMonthRange,
  resolvePreviousPeriod,
  resolveUniqueWorkoutByDate,
  resolveWorkoutNeighbors,
  resolveWorkoutNeighborsByDate,
  getTotalSets,
  getTotalVolume,
  getTrainingFrequencyPerWeek,
  getTrainingStreak,
} from './index'

describe('workout-core', () => {
  const sessions = loadSampleWorkoutSessions()

  it('calculates session sets and volume', () => {
    expect(getTotalSets(sessions[0])).toBe(3)
    expect(getTotalVolume(sessions[0])).toBe(1_800)
  })

  it('returns machine history independent of UI framework', () => {
    const history = getMachineHistory(sessions, 'shoulder-press')

    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      date: '2026-08-16',
      bestWeight: 22.5,
      bestReps: 10,
    })
  })

  it('returns machine history from oldest to newest for chronological charts', () => {
    const history = getMachineHistory([
      createSessionWithMachines('2026-08-16-01', '2026-08-16', [
        { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 25, reps: 10 }] },
      ]),
      createSessionWithMachines('2026-08-10-01', '2026-08-10', [
        { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 20, reps: 10 }] },
      ]),
    ], 'pec-deck')

    expect(history.map((row) => row.date)).toEqual(['2026-08-10', '2026-08-16'])
  })
  it('handles empty machine sets defensively without returning Infinity values', () => {
    const emptySetSessions: WorkoutSession[] = [
      {
        schema_version: 1,
        session_id: '2026-08-24-01',
        date: '2026-08-24',
        status: 'partial',
        gym: { id: 'example-gym', name: 'Example Gym' },
        machines: [
          {
            machine_id: 'pec-deck',
            name: 'Pec Deck',
            body_part: 'chest',
            sets: [],
          },
        ],
      },
    ]

    const history = getMachineHistory(emptySetSessions, 'pec-deck')

    expect(history[0]).toMatchObject({
      sets: 0,
      bestWeight: 0,
      bestReps: 0,
      volume: 0,
    })
  })

  it('calculates estimated 1RM', () => {
    expect(getEstimated1RM(90, 8)).toBe(114)
  })

  it('summarizes monthly sessions and volume', () => {
    expect(getMonthlySessions(sessions, 2026, 8)).toHaveLength(3)
    expect(getMonthlyVolume(sessions, 2026, 8)).toBeGreaterThan(0)
  })

  it('uses the runtime local calendar month for current month summaries', () => {
    expect(getCurrentLocalYearMonth(new Date(2026, 7, 31, 23, 59))).toEqual({ year: 2026, month: 8 })
    expect(getCurrentLocalYearMonth(new Date(2026, 8, 1, 0, 0))).toEqual({ year: 2026, month: 9 })
    expect(getCurrentLocalYearMonth(new Date(2026, 11, 31, 23, 59))).toEqual({ year: 2026, month: 12 })
    expect(getCurrentLocalYearMonth(new Date(2027, 0, 1, 0, 0))).toEqual({ year: 2027, month: 1 })
  })

  it('returns zero monthly summary values when the runtime month has no workout data', () => {
    expect(getMonthlySessions(sessions, 2026, 9)).toHaveLength(0)
    expect(getMonthlyVolume(sessions, 2026, 9)).toBe(0)
  })

  it('summarizes body parts', () => {
    const summary = getBodyPartSummary(sessions)

    expect(summary[0].volume).toBeGreaterThanOrEqual(summary.at(-1)?.volume ?? 0)
    expect(summary.map((item) => item.bodyPart)).toContain('legs')
  })

  it('returns personal record candidates', () => {
    const records = getPersonalRecords(sessions)

    expect(records.length).toBeGreaterThan(0)
    expect(records.some((record) => record.type === 'estimated_1rm')).toBe(true)
  })

  it('formats display-only labels consistently', () => {
    expect(formatDisplayDate('2026-08-16')).toBe('2026/08/16')
    expect(formatMachineTitleFromId('pulldown')).toBe('Pulldown')
    expect(formatMachineTitleFromId('lat-pulldown')).toBe('Lat Pulldown')
    expect(formatMachineTitleFromId('lat_pulldown_machine')).toBe('Lat Pulldown Machine')
    expect(formatBodyPart('shoulders')).toBe('肩')
    expect(formatWorkoutStatus('complete')).toBe('記録完了')
    expect(formatWeightKg(675)).toBe('675 kg')
    expect(formatTotalWeight(675)).toBe('合計重量: 675 kg')
    expect(formatPersonalRecordType('estimated_1rm')).toBe('推定1RM')
    expect(
      formatPersonalRecordValue({
        machineId: 'chest-press',
        machineName: 'チェストプレス',
        date: '2026-08-16',
        type: 'weight',
        value: 27.5,
      }),
    ).toBe('27.5 kg')
    expect(
      formatPersonalRecordValue({
        machineId: 'chest-press',
        machineName: 'チェストプレス',
        date: '2026-08-16',
        type: 'reps',
        value: 12,
      }),
    ).toBe('12 reps')
  })

  it('calculates simple streak and interval metrics', () => {
    expect(getTrainingStreak(sessions)).toBe(1)
    expect(getAverageSessionIntervalDays(sessions)).toBe(2)
  })

  it('calculates training frequency per week over the recorded date range', () => {
    const frequencySessions: WorkoutSession[] = [
      createMinimalSession('2026-08-01-01', '2026-08-01'),
      createMinimalSession('2026-08-08-01', '2026-08-08'),
      createMinimalSession('2026-08-15-01', '2026-08-15'),
    ]

    expect(getTrainingFrequencyPerWeek([])).toBe(0)
    expect(getTrainingFrequencyPerWeek([frequencySessions[0]])).toBe(1)
    expect(getTrainingFrequencyPerWeek(frequencySessions)).toBeCloseTo(1.4, 1)
  })

  it('filters recent sessions by an inclusive 28-day window', () => {
    const sourceSessions = [
      createMinimalSession('2026-07-19-01', '2026-07-19'),
      createMinimalSession('2026-07-20-01', '2026-07-20'),
      createMinimalSession('2026-08-16-01', '2026-08-16'),
    ]

    expect(getRecentSessions(sourceSessions, 28).map((session) => session.session_id)).toEqual([
      '2026-07-20-01',
      '2026-08-16-01',
    ])
  })

  it('resolves period presets without relying on frontend date logic', () => {
    const sourceSessions = [
      createMinimalSession('2026-01-10-01', '2026-01-10'),
      createMinimalSession('2026-07-31-01', '2026-07-31'),
      createMinimalSession('2026-08-01-01', '2026-08-01'),
      createMinimalSession('2026-08-28-01', '2026-08-28'),
    ]

    expect(resolvePeriodRange('7d', sourceSessions, '2026-08-28')).toEqual({
      startDate: '2026-08-22',
      endDate: '2026-08-28',
    })
    expect(resolvePeriodRange('28d', sourceSessions, '2026-08-28')).toEqual({
      startDate: '2026-08-01',
      endDate: '2026-08-28',
    })
    expect(resolvePeriodRange('month', sourceSessions, '2026-08-28')).toEqual({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    })
    expect(resolvePeriodRange('3m', sourceSessions, '2026-08-28')).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-08-31',
    })
    expect(resolvePeriodRange('6m', sourceSessions, '2026-01-15')).toEqual({
      startDate: '2025-08-01',
      endDate: '2026-01-31',
    })
    expect(resolvePeriodRange('all', sourceSessions)).toEqual({
      startDate: '2026-01-10',
      endDate: '2026-08-28',
    })
  })

  it('filters sessions by inclusive period ranges and resolves previous periods', () => {
    const sourceSessions = [
      createMinimalSession('2026-07-31-01', '2026-07-31'),
      createMinimalSession('2026-08-01-01', '2026-08-01'),
      createMinimalSession('2026-08-28-01', '2026-08-28'),
      createMinimalSession('2026-08-29-01', '2026-08-29'),
    ]

    expect(
      filterSessionsByDateRange(sourceSessions, { startDate: '2026-08-01', endDate: '2026-08-28' })
        .map((session) => session.session_id),
    ).toEqual(['2026-08-01-01', '2026-08-28-01'])
    expect(resolvePreviousPeriod({ startDate: '2026-08-01', endDate: '2026-08-28' })).toEqual({
      startDate: '2026-07-04',
      endDate: '2026-07-31',
    })
    expect(resolvePreviousMonthRange(2026, 1)).toEqual({
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    })
    expect(resolvePeriodComparison('all', sourceSessions).previous).toBeNull()
    expect(resolvePeriodComparison('month', sourceSessions, '2026-08-28').previous).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    })
  })

  it('calculates factual numeric deltas only when percentages are defined', () => {
    expect(getNumericDelta(15, 10)).toEqual({
      current: 15,
      previous: 10,
      absolute: 5,
      percentage: 50,
    })
    expect(getNumericDelta(3, 0)).toEqual({
      current: 3,
      previous: 0,
      absolute: 3,
      percentage: null,
    })
  })

  it('aggregates sessions by session, day, week, and month without volume comparisons', () => {
    const aggregateSessions: WorkoutSession[] = [
      createSessionWithMachines('2026-08-02-02', '2026-08-02', [
        { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 20, reps: 12 }] },
      ]),
      createSessionWithMachines('2026-08-02-01', '2026-08-02', [
        { machine_id: 'lat-pulldown', name: 'Lat Pulldown', body_part: 'back', sets: [{ set: 1, weight_kg: 45, reps: 10 }] },
      ]),
      createSessionWithMachines('2026-08-03-01', '2026-08-03', [
        {
          machine_id: 'leg-press',
          name: 'Leg Press',
          body_part: 'legs',
          sets: [
            { set: 1, weight_kg: 100, reps: 10 },
            { set: 2, weight_kg: 100, reps: 8 },
          ],
        },
      ]),
      createSessionWithMachines('2026-09-01-01', '2026-09-01', [
        { machine_id: 'abdominal', name: 'Abdominal', body_part: 'core', sets: [{ set: 1, weight_kg: 35, reps: 15 }] },
      ]),
    ]

    expect(getSessionAggregates(aggregateSessions).map((session) => session.sessionId)).toEqual([
      '2026-08-02-01',
      '2026-08-02-02',
      '2026-08-03-01',
      '2026-09-01-01',
    ])
    expect(getDailyAggregates(aggregateSessions)[0]).toMatchObject({
      date: '2026-08-02',
      sessionCount: 2,
      machineCount: 2,
      setCount: 2,
      repCount: 22,
    })
    expect(getWeeklyAggregates(aggregateSessions)).toEqual([
      {
        weekStartDate: '2026-07-27',
        weekEndDate: '2026-08-02',
        sessionCount: 2,
        machineCount: 2,
        setCount: 2,
        repCount: 22,
      },
      {
        weekStartDate: '2026-08-03',
        weekEndDate: '2026-08-09',
        sessionCount: 1,
        machineCount: 1,
        setCount: 2,
        repCount: 18,
      },
      {
        weekStartDate: '2026-08-31',
        weekEndDate: '2026-09-06',
        sessionCount: 1,
        machineCount: 1,
        setCount: 1,
        repCount: 15,
      },
    ])
    expect(getMonthlyAggregates(aggregateSessions)).toEqual([
      {
        month: '2026-08',
        sessionCount: 3,
        machineCount: 3,
        setCount: 4,
        repCount: 40,
      },
      {
        month: '2026-09',
        sessionCount: 1,
        machineCount: 1,
        setCount: 1,
        repCount: 15,
      },
    ])
  })

  it('resolves calendar month ranges and daily training markers', () => {
    const calendarSessions = [
      createMinimalSession('2026-02-01-01', '2026-02-01'),
      createMinimalSession('2026-02-01-02', '2026-02-01'),
      createMinimalSession('2026-03-01-01', '2026-03-01'),
    ]
    const calendar = getCalendarMonthAggregates(calendarSessions, 2026, 2)

    expect(resolveCalendarMonthRange(2026, 2)).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    })
    expect(calendar).toHaveLength(28)
    expect(calendar[0]).toMatchObject({
      date: '2026-02-01',
      trainingDay: true,
      sessionCount: 2,
    })
    expect(calendar[1]).toEqual({
      date: '2026-02-02',
      trainingDay: false,
      sessionCount: 0,
      sessions: [],
    })
  })

  it('counts unique machines by body part for a period', () => {
    const varietySessions: WorkoutSession[] = [
      createSessionWithMachines('2026-08-10-01', '2026-08-10', [
        { machine_id: 'leg-press', name: 'Leg Press', body_part: 'legs', sets: [{ set: 1, weight_kg: 100, reps: 10 }] },
        { machine_id: 'leg-press', name: 'Leg Press', body_part: 'legs', sets: [{ set: 1, weight_kg: 100, reps: 10 }] },
        { machine_id: 'hack-squat', name: 'Hack Squat', body_part: 'legs', sets: [{ set: 1, weight_kg: 80, reps: 10 }] },
      ]),
      createSessionWithMachines('2026-08-16-01', '2026-08-16', [
        { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 20, reps: 10 }] },
      ]),
    ]

    expect(getBodyPartMachineVariety(varietySessions)).toEqual([
      { bodyPart: 'legs', machineCount: 2 },
      { bodyPart: 'chest', machineCount: 1 },
    ])
  })

  it('calculates average set weight without reps or volume weighting', () => {
    const averageSessions: WorkoutSession[] = [
      createSessionWithMachines('2026-08-10-01', '2026-08-10', [
        {
          machine_id: 'pec-deck',
          name: 'Pec Deck',
          body_part: 'chest',
          sets: [
            { set: 1, weight_kg: 20, reps: 20 },
            { set: 2, weight_kg: 22.5, reps: 1 },
          ],
        },
      ]),
      createSessionWithMachines('2026-08-16-01', '2026-08-16', [
        {
          machine_id: 'pec-deck',
          name: 'Pec Deck',
          body_part: 'chest',
          sets: [{ set: 1, weight_kg: 25, reps: 10 }],
        },
      ]),
    ]

    expect(getAverageSetWeight(averageSessions, 'pec-deck')).toBe(22.5)
    expect(getAverageSetWeight(averageSessions, 'leg-press')).toBeNull()
  })

  it('summarizes factual workout values without weight or volume judgment', () => {
    const summarySession = createSessionWithMachines('2026-08-10-01', '2026-08-10', [
      {
        machine_id: 'pec-deck',
        name: 'Pec Deck',
        body_part: 'chest',
        sets: [
          { set: 1, weight_kg: 20, reps: 12 },
          { set: 2, weight_kg: 20, reps: 10 },
        ],
      },
      {
        machine_id: 'lat-pulldown',
        name: 'Lat Pulldown',
        body_part: 'back',
        sets: [{ set: 1, weight_kg: 45, reps: 8 }],
      },
    ])

    expect(getWorkoutSummary(summarySession)).toEqual({
      sessionId: '2026-08-10-01',
      date: '2026-08-10',
      gym: 'Example Gym',
      machineCount: 2,
      setCount: 3,
      totalReps: 30,
    })
  })

  it('resolves previous and next workouts by session id with boundary nulls', () => {
    const sourceSessions = [
      createMinimalSession('2026-08-03-01', '2026-08-03'),
      createMinimalSession('2026-08-01-01', '2026-08-01'),
      createMinimalSession('2026-08-02-02', '2026-08-02'),
      createMinimalSession('2026-08-02-01', '2026-08-02'),
    ]

    expect(resolveWorkoutNeighbors(sourceSessions, '2026-08-02-01')).toMatchObject({
      current: { session_id: '2026-08-02-01' },
      previous: { session_id: '2026-08-01-01' },
      next: { session_id: '2026-08-02-02' },
    })
    expect(resolveWorkoutNeighbors(sourceSessions, '2026-08-01-01')).toMatchObject({
      current: { session_id: '2026-08-01-01' },
      previous: null,
      next: { session_id: '2026-08-02-01' },
    })
    expect(resolveWorkoutNeighbors(sourceSessions, 'missing')).toBeNull()
  })

  it('resolves date-based workout navigation only when the date is unique', () => {
    const sourceSessions = [
      createMinimalSession('2026-08-01-01', '2026-08-01'),
      createMinimalSession('2026-08-02-01', '2026-08-02'),
      createMinimalSession('2026-08-02-02', '2026-08-02'),
      createMinimalSession('2026-08-03-01', '2026-08-03'),
    ]

    expect(resolveUniqueWorkoutByDate(sourceSessions, '2026-08-01')?.session_id).toBe('2026-08-01-01')
    expect(resolveUniqueWorkoutByDate(sourceSessions, '2026-08-02')).toBeNull()
    expect(resolveWorkoutNeighborsByDate(sourceSessions, '2026-08-01')).toMatchObject({
      current: { session_id: '2026-08-01-01' },
      previous: null,
      next: { session_id: '2026-08-02-01' },
    })
    expect(resolveWorkoutNeighborsByDate(sourceSessions, '2026-08-02')).toBeNull()
  })

  it('compares sessions by factual counts and machine membership only', () => {
    const previous = createSessionWithMachines('2026-08-01-01', '2026-08-01', [
      {
        machine_id: 'pec-deck',
        name: 'Pec Deck',
        body_part: 'chest',
        sets: [{ set: 1, weight_kg: 20, reps: 10 }],
      },
      {
        machine_id: 'lat-pulldown',
        name: 'Lat Pulldown',
        body_part: 'back',
        sets: [{ set: 1, weight_kg: 45, reps: 10 }],
      },
    ])
    const current = createSessionWithMachines('2026-08-08-01', '2026-08-08', [
      {
        machine_id: 'pec-deck',
        name: 'Pec Deck',
        body_part: 'chest',
        sets: [
          { set: 1, weight_kg: 20, reps: 12 },
          { set: 2, weight_kg: 20, reps: 8 },
        ],
      },
      {
        machine_id: 'leg-press',
        name: 'Leg Press',
        body_part: 'legs',
        sets: [{ set: 1, weight_kg: 100, reps: 10 }],
      },
    ])

    expect(compareWorkoutSessions(current, previous)).toMatchObject({
      machineCountDelta: { current: 2, previous: 2, absolute: 0, percentage: 0 },
      setCountDelta: { current: 3, previous: 2, absolute: 1, percentage: 50 },
      totalRepsDelta: { current: 30, previous: 20, absolute: 10, percentage: 50 },
      addedMachines: [{ machineId: 'leg-press', machineName: 'Leg Press' }],
      removedMachines: [{ machineId: 'lat-pulldown', machineName: 'Lat Pulldown' }],
    })
  })

  it('summarizes frequency and consistency distribution facts', () => {
    const distributionSessions = createDistributionSessions()

    expect(getWeekdayDistribution(distributionSessions)).toEqual([
      { weekday: 0, sessionCount: 0, trainingDayCount: 0 },
      { weekday: 1, sessionCount: 1, trainingDayCount: 1 },
      { weekday: 2, sessionCount: 2, trainingDayCount: 1 },
      { weekday: 3, sessionCount: 1, trainingDayCount: 1 },
      { weekday: 4, sessionCount: 0, trainingDayCount: 0 },
      { weekday: 5, sessionCount: 0, trainingDayCount: 0 },
      { weekday: 6, sessionCount: 0, trainingDayCount: 0 },
    ])
    expect(getMonthlyTrainingDays(distributionSessions)).toEqual([
      { month: '2026-08', trainingDayCount: 2, sessionCount: 3 },
      { month: '2026-09', trainingDayCount: 1, sessionCount: 1 },
    ])
  })

  it('summarizes body part distribution, share, trend, and last trained dates', () => {
    const distributionSessions = createDistributionSessions()

    expect(getSetsByBodyPart(distributionSessions)).toEqual([
      { bodyPart: 'back', setCount: 1 },
      { bodyPart: 'chest', setCount: 3 },
      { bodyPart: 'legs', setCount: 1 },
    ])
    expect(getBodyPartFrequency(distributionSessions)).toEqual([
      { bodyPart: 'back', sessionCount: 1 },
      { bodyPart: 'chest', sessionCount: 3 },
      { bodyPart: 'legs', sessionCount: 1 },
    ])
    expect(getBodyPartShare(distributionSessions)).toEqual([
      { bodyPart: 'back', setCount: 1, share: 0.2 },
      { bodyPart: 'chest', setCount: 3, share: 0.6 },
      { bodyPart: 'legs', setCount: 1, share: 0.2 },
    ])
    expect(getBodyPartTrend(distributionSessions)).toEqual([
      { month: '2026-08', bodyPart: 'back', setCount: 1, sessionCount: 1 },
      { month: '2026-08', bodyPart: 'chest', setCount: 2, sessionCount: 2 },
      { month: '2026-09', bodyPart: 'chest', setCount: 1, sessionCount: 1 },
      { month: '2026-09', bodyPart: 'legs', setCount: 1, sessionCount: 1 },
    ])
    expect(getLastTrainedDateByBodyPart(distributionSessions)).toEqual([
      { bodyPart: 'chest', lastTrainedDate: '2026-09-02' },
      { bodyPart: 'legs', lastTrainedDate: '2026-09-02' },
      { bodyPart: 'back', lastTrainedDate: '2026-08-25' },
    ])
  })

  it('counts body part trend sessions once when a session has multiple machines for the same body part', () => {
    const trendSessions = [
      createSessionWithMachines('2026-09-02-01', '2026-09-02', [
        { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 22.5, reps: 10 }] },
        { machine_id: 'chest-press', name: 'Chest Press', body_part: 'chest', sets: [{ set: 1, weight_kg: 30, reps: 10 }] },
      ]),
    ]

    expect(getBodyPartTrend(trendSessions)).toEqual([
      { month: '2026-09', bodyPart: 'chest', setCount: 2, sessionCount: 1 },
    ])
  })

  it('ranks machine frequency and groups sessions by gym without weight semantics', () => {
    const distributionSessions = createDistributionSessions()

    expect(getMachineFrequencyRanking(distributionSessions)).toEqual([
      { machineId: 'pec-deck', machineName: 'Pec Deck', bodyPart: 'chest', sessionCount: 3, occurrenceCount: 3 },
      { machineId: 'lat-pulldown', machineName: 'Lat Pulldown', bodyPart: 'back', sessionCount: 1, occurrenceCount: 1 },
      { machineId: 'leg-press', machineName: 'Leg Press', bodyPart: 'legs', sessionCount: 1, occurrenceCount: 1 },
    ])
    expect(getSessionsByGym(distributionSessions)).toEqual([
      { gymId: 'example-gym', gymName: 'Example Gym', sessionCount: 3 },
      { gymId: 'second-gym', gymName: 'Second Gym', sessionCount: 1 },
    ])
  })
})

function createMinimalSession(sessionId: string, date: string): WorkoutSession {
  return {
    schema_version: 1,
    session_id: sessionId,
    date,
    status: 'complete',
    gym: { id: 'example-gym', name: 'Example Gym' },
    machines: [],
  }
}

function createSessionWithMachines(
  sessionId: string,
  date: string,
  machines: WorkoutSession['machines'],
): WorkoutSession {
  return {
    ...createMinimalSession(sessionId, date),
    machines,
  }
}

function createDistributionSessions(): WorkoutSession[] {
  return [
    createSessionWithMachines('2026-08-24-01', '2026-08-24', [
      { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 20, reps: 10 }] },
    ]),
    {
      ...createSessionWithMachines('2026-08-25-01', '2026-08-25', [
        { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 20, reps: 10 }] },
        { machine_id: 'lat-pulldown', name: 'Lat Pulldown', body_part: 'back', sets: [{ set: 1, weight_kg: 45, reps: 10 }] },
      ]),
      gym: { id: 'second-gym', name: 'Second Gym' },
    },
    createSessionWithMachines('2026-08-25-02', '2026-08-25', []),
    createSessionWithMachines('2026-09-02-01', '2026-09-02', [
      { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 22.5, reps: 10 }] },
      { machine_id: 'leg-press', name: 'Leg Press', body_part: 'legs', sets: [{ set: 1, weight_kg: 100, reps: 10 }] },
    ]),
  ]
}


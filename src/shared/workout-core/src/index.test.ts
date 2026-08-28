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
  getAverageSetWeight,
  getAverageSessionIntervalDays,
  getBodyPartMachineVariety,
  getBodyPartSummary,
  getCurrentLocalYearMonth,
  getEstimated1RM,
  getMachineHistory,
  getMonthlySessions,
  getMonthlyVolume,
  getPersonalRecords,
  getRecentSessions,
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


import { describe, expect, it } from 'vitest'
import type { BodyPart, WorkoutSession } from '@workout-lab/workout-types'
import { defaultWorkoutListFilters, filterWorkoutSessions } from './workout-list-filters'

const sessions: WorkoutSession[] = [
  session('s1', '2026-08-10', 'North Gym', 'NG', [
    machine('pec-deck', 'Pec Deck', 'chest'),
    machine('leg-press', 'Leg Press', 'legs'),
  ]),
  session('s2', '2026-08-12', 'South Gym', 'SG', [
    machine('lat-pulldown', 'Lat Pulldown', 'back'),
  ]),
  session('s3', '2026-08-12', 'North Gym', 'NG', [
    machine('shoulder-press', 'Shoulder Press', 'shoulders'),
  ]),
]

describe('filterWorkoutSessions', () => {
  it('filters by search text across date, gym, and machine fields', () => {
    expect(ids(filterWorkoutSessions(sessions, { ...defaultWorkoutListFilters, searchText: 'lat' }))).toEqual(['s2'])
    expect(ids(filterWorkoutSessions(sessions, { ...defaultWorkoutListFilters, searchText: 'North' }))).toEqual(['s1', 's3'])
    expect(ids(filterWorkoutSessions(sessions, { ...defaultWorkoutListFilters, searchText: '2026-08-10' }))).toEqual(['s1'])
  })

  it('combines machine, body part, gym, and search filters with AND semantics', () => {
    const result = filterWorkoutSessions(sessions, {
      ...defaultWorkoutListFilters,
      searchText: 'press',
      selectedMachine: 'Shoulder Press',
      selectedBodyPart: 'shoulders',
      selectedGym: 'North Gym',
    })

    expect(ids(result)).toEqual(['s3'])
  })

  it('applies inclusive date range boundaries', () => {
    const result = filterWorkoutSessions(sessions, {
      ...defaultWorkoutListFilters,
      dateFrom: '2026-08-10',
      dateTo: '2026-08-12',
    })

    expect(ids(result)).toEqual(['s1', 's2', 's3'])
  })

  it('preserves source ordering because table sorting owns presentation order', () => {
    expect(ids(filterWorkoutSessions(sessions, defaultWorkoutListFilters))).toEqual(['s1', 's2', 's3'])
  })

  it('returns an empty result when filters do not match', () => {
    expect(filterWorkoutSessions(sessions, { ...defaultWorkoutListFilters, selectedGym: 'Missing Gym' })).toEqual([])
  })
})

function ids(items: WorkoutSession[]): string[] {
  return items.map((session) => session.session_id)
}

function session(
  sessionId: string,
  date: string,
  gymName: string,
  gymShortName: string,
  machines: WorkoutSession['machines'],
): WorkoutSession {
  return {
    schema_version: 1,
    session_id: sessionId,
    date,
    status: 'complete',
    gym: { id: gymName.toLocaleLowerCase().replaceAll(' ', '-'), name: gymName, short_name: gymShortName },
    machines,
    notes: [],
  }
}

function machine(machineId: string, name: string, bodyPart: BodyPart): WorkoutSession['machines'][number] {
  return {
    machine_id: machineId,
    name,
    body_part: bodyPart,
    sets: [{ set: 1, weight_kg: 40, reps: 10 }],
    notes: [],
  }
}

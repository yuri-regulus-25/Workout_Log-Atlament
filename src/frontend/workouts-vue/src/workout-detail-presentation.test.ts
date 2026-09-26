import { describe, expect, it } from 'vitest'
import type { BodyPart, WorkoutSession } from '@workout-lab/workout-types'
import { formatCountLabel, getMachinePresentation, getMachineReps, getWorkoutDaySummary } from './workout-detail-presentation'
import detailSource from './views/WorkoutDetailView.vue?raw'

describe('workout detail presentation helpers', () => {
  it('Set Notesは既存のnoteを表示し、NotesのないMachineには列を追加しない', () => {
    expect(detailSource).toContain('<th v-if="machine.sets.some(set => set.note)">Notes</th>')
    expect(detailSource).toContain('<td v-if="machine.sets.some(set => set.note)" class="set-note">{{ set.note }}</td>')
  })

  it('summarizes multiple sessions and gyms with total reps', () => {
    const result = getWorkoutDaySummary([
      session('s1', 'North Gym', [
        machine('pec-deck', 'Pec Deck', 'chest', [[40, 10], [45, 8]]),
      ]),
      session('s2', 'South Gym', [
        machine('lat-pulldown', 'Lat Pulldown', 'back', [[50, 9]]),
        machine('leg-press', 'Leg Press', 'legs', [[100, 12]]),
      ]),
    ])

    expect(result).toEqual({
      sessionCount: 2,
      gymNames: 'North Gym / South Gym',
      totalMachines: 3,
      totalSets: 4,
      totalReps: 39,
      totalVolume: 2410,
    })
  })

  it('reports machine reps, volume, and RIR presence for set tables', () => {
    const item = machine('pec-deck', 'Pec Deck', 'chest', [[40, 10], [45, 8]], 1)

    expect(getMachineReps(item)).toBe(18)
    expect(getMachinePresentation(item)).toEqual({
      reps: 18,
      volume: 760,
      hasRir: true,
    })
  })

  it('formats zero and absolute one counts as singular', () => {
    expect(formatCountLabel(0, 'Machine', 'Machines')).toBe('0 Machine')
    expect(formatCountLabel(1, 'Set', 'Sets')).toBe('1 Set')
    expect(formatCountLabel(2, 'Rep', 'Reps')).toBe('2 Reps')
    expect(formatCountLabel(-1, 'Rep', 'Reps')).toBe('-1 Rep')
    expect(formatCountLabel(-2, 'Rep', 'Reps')).toBe('-2 Reps')
  })
})

function session(
  sessionId: string,
  gymName: string,
  machines: WorkoutSession['machines'],
): WorkoutSession {
  return {
    schema_version: 1,
    session_id: sessionId,
    date: '2026-08-24',
    status: 'complete',
    gym: { id: gymName.toLocaleLowerCase().replaceAll(' ', '-'), name: gymName },
    machines,
    notes: ['note'],
  }
}

function machine(
  machineId: string,
  name: string,
  bodyPart: BodyPart,
  sets: Array<[number, number]>,
  rir?: number,
): WorkoutSession['machines'][number] {
  return {
    machine_id: machineId,
    name,
    body_part: bodyPart,
    sets: sets.map(([weight_kg, reps], index) => ({
      set: index + 1,
      weight_kg,
      reps,
      rir: index === 0 ? rir : undefined,
    })),
    notes: ['machine note'],
  }
}

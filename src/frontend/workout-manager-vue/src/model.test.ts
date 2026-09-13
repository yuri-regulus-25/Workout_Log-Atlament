import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import type { WorkoutSessionInput } from '@workout-lab/frontend-common'
import { cloneSession } from './model'

describe('cloneSession', () => {
  it('Reactive Proxyを独立したWorkout Session DTOへ複製する', () => {
    const source = reactive<WorkoutSessionInput>({
      date: '2026-09-01',
      gymId: 'gym-1',
      machines: [{
        sourceIndex: 0,
        machineId: 'machine-1',
        sets: [{ sourceIndex: 0, reps: 10, weightKg: 25.5, notes: 'set note' }],
      }],
      notes: 'session note',
    })

    const cloned = cloneSession(source)

    expect(cloned).toEqual(source)
    expect(cloned).not.toBe(source)
    expect(cloned.machines).not.toBe(source.machines)
    expect(cloned.machines[0]?.sets).not.toBe(source.machines[0]?.sets)
  })
})

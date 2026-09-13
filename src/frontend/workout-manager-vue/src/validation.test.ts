import { describe, expect, it } from 'vitest'
import type { WorkoutMasterOption, WorkoutSessionInput } from '@workout-lab/frontend-common'
import { validateSession } from './validation'

const gyms: WorkoutMasterOption[] = [{ id: 'gym-active', name: '有効なジム', active: true, deleted: false }]
const machines: WorkoutMasterOption[] = [{ id: 'machine-active', name: '有効なマシン', active: true, deleted: false }]

function session(): WorkoutSessionInput {
  return {
    date: '2026-09-13',
    gymId: 'gym-active',
    machines: [{ sourceIndex: 0, machineId: 'machine-active', sets: [{ sourceIndex: 0, reps: 10, weightKg: 0, notes: null }] }],
    notes: null,
  }
}

describe('Workout Manager validation', () => {
  it('accepts zero weight and rejects negative weight with the final message', () => {
    const valid = session()
    expect(validateSession(valid, valid, gyms, machines)).toEqual([])

    const invalid = session()
    invalid.machines[0]!.sets[0]!.weightKg = -1
    expect(validateSession(invalid, session(), gyms, machines)).toContainEqual({
      path: 'machines[0].sets[0].weightKg',
      message: '数字を入力してください',
    })
  })

  it('grandfathers unchanged legacy notes but validates edited notes', () => {
    const original = session()
    original.notes = 'a'.repeat(401)
    const unchanged = structuredClone(original)
    expect(validateSession(unchanged, original, gyms, machines)).toEqual([])

    const edited = structuredClone(original)
    edited.notes = 'b'.repeat(401)
    expect(validateSession(edited, original, gyms, machines)).toContainEqual({ path: 'notes', message: '400字以内に入力してください' })
  })

  it('grandfathers an unchanged invalid reference but rejects a newly selected invalid reference', () => {
    const original = session()
    original.gymId = 'gym-legacy'
    const unchanged = structuredClone(original)
    expect(validateSession(unchanged, original, gyms, machines)).toEqual([])

    const changed = session()
    changed.gymId = 'gym-missing'
    expect(validateSession(changed, original, gyms, machines)).toContainEqual({ path: 'gymId', message: 'マスターデータに存在しません' })
  })

  it('rejects duplicate machines and invalid set bounds', () => {
    const value = session()
    value.machines.push(structuredClone(value.machines[0]!))
    value.machines[1]!.sourceIndex = null
    value.machines[0]!.sets[0]!.reps = 101
    value.machines[0]!.sets[0]!.weightKg = 1000
    const errors = validateSession(value, session(), gyms, machines)
    expect(errors.map((error) => error.message)).toEqual(expect.arrayContaining([
      '同じマシンは選択できません',
      '100以下の数値を入力してください',
      '999.99以下の数値を入力してください',
    ]))
  })
})

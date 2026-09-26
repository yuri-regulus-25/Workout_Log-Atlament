import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import type { WorkoutSessionInput } from '@workout-lab/frontend-common'
import { cloneSession, emptyMachine, sessionLabel } from './model'

describe('cloneSession', () => {
  it('Reactive Proxyを独立したWorkout Session DTOへ複製する', () => {
    const source = reactive<WorkoutSessionInput>({
      date: '2026-09-01',
      gymId: 'gym-1',
      machines: [{
        sourceIndex: 0,
        machineId: 'machine-1',
        notes: 'マシン\nメモ',
        sets: [{ sourceIndex: 0, reps: 10, weightKg: 25.5, notes: 'て\nすと' }],
      }],
      notes: 'こんにちは\n次の行',
    })

    const cloned = cloneSession(source)

    expect(cloned).toEqual(source)
    expect(cloned).not.toBe(source)
    expect(cloned.machines).not.toBe(source.machines)
    expect(cloned.machines[0]?.sets).not.toBe(source.machines[0]?.sets)
    expect(JSON.parse(JSON.stringify(cloned)).machines[0].sets[0].notes).toBe('て\nすと')
    expect(JSON.parse(JSON.stringify(cloned)).machines[0].notes).toBe('マシン\nメモ')
  })
  it('Machine Notesを複数Machineで共有せず、新規Machineへ引き継がない', () => {
    const first = emptyMachine()
    first.notes = '先頭\nメモ'
    const second = emptyMachine()
    second.notes = '二番目'
    const cloned = cloneSession({ date: '2026-09-13', gymId: null, machines: [first, second], notes: null })
    cloned.machines[0]!.notes = '変更'
    expect(first.notes).toBe('先頭\nメモ')
    expect(cloned.machines[1]!.notes).toBe('二番目')
    expect(emptyMachine().notes).toBeNull()
  })
})

describe('sessionLabel', () => {
  it('既存Sessionの順序と新規作成の表示名を確認画面でも維持する', () => {
    expect(sessionLabel(0)).toBe('セッション1')
    expect(sessionLabel(1)).toBe('セッション2')
    expect(sessionLabel(null)).toBe('セッションを追加する')
  })
})

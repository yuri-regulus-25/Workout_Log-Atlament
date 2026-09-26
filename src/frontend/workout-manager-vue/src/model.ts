import type { WorkoutMachineInput, WorkoutSessionInput, WorkoutSetInput } from '@workout-lab/frontend-common'

export type Mode = 'create' | 'update' | 'delete'

/** Session Selector と確認画面で共用する表示名。null は新規作成を表す。 */
export function sessionLabel(index: number | null): string {
  return index === null ? 'セッションを追加する' : `セッション${index + 1}`
}

export function emptySet(): WorkoutSetInput {
  return { sourceIndex: null, reps: null, weightKg: null, notes: null }
}

export function emptyMachine(): WorkoutMachineInput {
  return { sourceIndex: null, machineId: null, sets: [emptySet()], notes: null }
}

export function emptySession(date: string): WorkoutSessionInput {
  return { date, gymId: null, machines: [emptyMachine()], notes: null }
}

export function cloneSession(session: WorkoutSessionInput): WorkoutSessionInput {
  return {
    date: session.date,
    gymId: session.gymId,
    machines: session.machines.map(machine => ({
      sourceIndex: machine.sourceIndex,
      machineId: machine.machineId,
      notes: machine.notes,
      sets: machine.sets.map(set => ({
        sourceIndex: set.sourceIndex,
        reps: set.reps,
        weightKg: set.weightKg,
        notes: set.notes,
      })),
    })),
    notes: session.notes,
  }
}

import type { WorkoutMachineInput, WorkoutSessionInput, WorkoutSetInput } from '@workout-lab/frontend-common'

export type Mode = 'create' | 'update' | 'delete'

export function emptySet(): WorkoutSetInput {
  return { sourceIndex: null, reps: null, weightKg: null, notes: null }
}

export function emptyMachine(): WorkoutMachineInput {
  return { sourceIndex: null, machineId: null, sets: [emptySet()] }
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

import type { WorkoutSession } from '@workout-lab/workout-types'
import { getGymDisplayName, getMachineVolume, getSessionSetCount, getSessionVolume } from '@workout-lab/workout-core'

export type WorkoutDaySummary = {
  sessionCount: number
  gymNames: string
  totalMachines: number
  totalSets: number
  totalReps: number
  totalVolume: number
}

export function getMachineReps(machine: WorkoutSession['machines'][number]): number {
  return machine.sets.reduce((total, set) => total + set.reps, 0)
}

export function getWorkoutDaySummary(sessions: WorkoutSession[]): WorkoutDaySummary {
  return {
    sessionCount: sessions.length,
    gymNames: Array.from(new Set(sessions.map((session) => getGymDisplayName(session.gym)))).join(' / '),
    totalMachines: sessions.reduce((total, session) => total + session.machines.length, 0),
    totalSets: sessions.reduce((total, session) => total + getSessionSetCount(session), 0),
    totalReps: sessions.reduce((total, session) => total + session.machines.reduce(
      (sessionTotal, machine) => sessionTotal + getMachineReps(machine),
      0,
    ), 0),
    totalVolume: sessions.reduce((total, session) => total + getSessionVolume(session), 0),
  }
}

export function getMachinePresentation(machine: WorkoutSession['machines'][number]) {
  return {
    reps: getMachineReps(machine),
    volume: getMachineVolume(machine),
    hasRir: machine.sets.some((set) => set.rir !== undefined && set.rir !== null),
  }
}

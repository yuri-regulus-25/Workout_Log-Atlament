import { getGymDisplayName, getGymShortDisplayName, getMachineDisplayName } from '@workout-lab/workout-core'
import type { WorkoutSession } from '@workout-lab/workout-types'

export type WorkoutListFilters = {
  searchText: string
  selectedMachine: string
  selectedBodyPart: string
  selectedGym: string
  dateFrom: string
  dateTo: string
}

export const defaultWorkoutListFilters: WorkoutListFilters = {
  searchText: '',
  selectedMachine: 'all',
  selectedBodyPart: 'all',
  selectedGym: 'all',
  dateFrom: '',
  dateTo: '',
}

export function filterWorkoutSessions(
  sessions: WorkoutSession[],
  filters: WorkoutListFilters,
): WorkoutSession[] {
  const query = filters.searchText.trim().toLocaleLowerCase()

  return sessions
    .filter((session) => {
      const searchTarget = [
        session.date,
        getGymDisplayName(session.gym),
        getGymShortDisplayName(session.gym),
        ...session.machines.flatMap((machine) => [
          getMachineDisplayName(machine),
          machine.machine_id,
          machine.body_part ?? '',
        ]),
      ].join(' ').toLocaleLowerCase()

      const matchesSearch = query.length === 0 || searchTarget.includes(query)
      const matchesMachine =
        filters.selectedMachine === 'all' ||
        session.machines.some((machine) => getMachineDisplayName(machine) === filters.selectedMachine)
      const matchesBodyPart =
        filters.selectedBodyPart === 'all' ||
        session.machines.some((machine) => machine.body_part === filters.selectedBodyPart)
      const matchesGym = filters.selectedGym === 'all' || getGymDisplayName(session.gym) === filters.selectedGym
      const matchesFrom = filters.dateFrom.length === 0 || session.date >= filters.dateFrom
      const matchesTo = filters.dateTo.length === 0 || session.date <= filters.dateTo

      return matchesSearch && matchesMachine && matchesBodyPart && matchesGym && matchesFrom && matchesTo
    })
}

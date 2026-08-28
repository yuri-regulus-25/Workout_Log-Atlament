import type { WorkoutSession } from '@workout-lab/workout-types'

export type WorkoutListFilters = {
  searchText: string
  selectedMachine: string
  selectedBodyPart: string
  selectedGym: string
  dateFrom: string
  dateTo: string
  sortDirection: 'desc' | 'asc'
}

export const defaultWorkoutListFilters: WorkoutListFilters = {
  searchText: '',
  selectedMachine: 'all',
  selectedBodyPart: 'all',
  selectedGym: 'all',
  dateFrom: '',
  dateTo: '',
  sortDirection: 'desc',
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
        session.gym.name,
        session.gym.short_name ?? '',
        ...session.machines.flatMap((machine) => [
          machine.name,
          machine.machine_id,
          machine.body_part,
        ]),
      ].join(' ').toLocaleLowerCase()

      const matchesSearch = query.length === 0 || searchTarget.includes(query)
      const matchesMachine =
        filters.selectedMachine === 'all' ||
        session.machines.some((machine) => machine.name === filters.selectedMachine)
      const matchesBodyPart =
        filters.selectedBodyPart === 'all' ||
        session.machines.some((machine) => machine.body_part === filters.selectedBodyPart)
      const matchesGym = filters.selectedGym === 'all' || session.gym.name === filters.selectedGym
      const matchesFrom = filters.dateFrom.length === 0 || session.date >= filters.dateFrom
      const matchesTo = filters.dateTo.length === 0 || session.date <= filters.dateTo

      return matchesSearch && matchesMachine && matchesBodyPart && matchesGym && matchesFrom && matchesTo
    })
    .sort((a, b) => (
      filters.sortDirection === 'asc'
        ? a.date.localeCompare(b.date) || a.session_id.localeCompare(b.session_id)
        : b.date.localeCompare(a.date) || b.session_id.localeCompare(a.session_id)
    ))
}

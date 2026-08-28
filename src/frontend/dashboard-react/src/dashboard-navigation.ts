import { applicationRoutes } from '@workout-lab/frontend-common/navigation'

export type WorkoutDateSource = {
  date: string
}

export function getWorkoutDetailRoute(date: string): string {
  return `${applicationRoutes.workouts}${date}/`
}

export function getWorkoutListRoute(): string {
  return applicationRoutes.workouts
}

export function getUniqueWorkoutDateRoute(sessions: readonly WorkoutDateSource[], targetIndex: number): string | null {
  const target = sessions[targetIndex]
  if (!target) {
    return null
  }

  const matchingDates = sessions.filter((session) => session.date === target.date)
  return matchingDates.length === 1 ? getWorkoutDetailRoute(target.date) : null
}

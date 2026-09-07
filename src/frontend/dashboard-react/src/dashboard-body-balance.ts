import type { WorkoutSession } from '@workout-lab/workout-types'
import { formatBodyPart, getBodyPartSummary } from '@workout-lab/workout-core'

const dashboardBodyPartOrder = ['shoulders', 'arms', 'chest', 'core', 'back', 'glutes', 'legs']

export function getDashboardBodyBalanceRows(monthlySessions: WorkoutSession[]) {
  const summaryByBodyPart = new Map(
    getBodyPartSummary(monthlySessions)
      .filter((item) => item.bodyPart !== 'cardio')
      .map((item) => [item.bodyPart, item.sets]),
  )
  const orderedRows = dashboardBodyPartOrder.map((bodyPart) => ({
    bodyPart,
    label: formatBodyPart(bodyPart),
    sets: summaryByBodyPart.get(bodyPart) ?? 0,
  }))
  const knownBodyParts = new Set(dashboardBodyPartOrder)
  const additionalRows = Array.from(summaryByBodyPart.entries())
    .filter(([bodyPart]) => !knownBodyParts.has(bodyPart))
    .map(([bodyPart, sets]) => ({
      bodyPart,
      label: formatBodyPart(bodyPart),
      sets,
    }))

  return [...orderedRows, ...additionalRows]
}

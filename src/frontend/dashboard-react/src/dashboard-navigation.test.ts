import { describe, expect, it } from 'vitest'
import { getUniqueWorkoutDateRoute, getWorkoutListRoute } from './dashboard-navigation'

describe('dashboard navigation', () => {
  it('builds Workout Domain routes from existing date-based routing', () => {
    expect(getWorkoutListRoute()).toBe('/workouts/')
  })

  it('returns a chart data point route only when the date is unique', () => {
    expect(getUniqueWorkoutDateRoute([{ date: '2026-08-14' }, { date: '2026-08-21' }], 1)).toBe('/workouts/2026-08-21/')
    expect(getUniqueWorkoutDateRoute([{ date: '2026-08-14' }, { date: '2026-08-14' }], 0)).toBeNull()
    expect(getUniqueWorkoutDateRoute([{ date: '2026-08-14' }], 5)).toBeNull()
  })
})

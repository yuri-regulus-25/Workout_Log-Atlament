import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Workout calendar composition contract', () => {
  it('keeps calendar month navigation in a dedicated Vue component', () => {
    const component = readFileSync('src/frontend/workouts-vue/src/components/WorkoutCalendar.vue', 'utf8')
    const page = readFileSync('src/frontend/workouts-vue/src/views/WorkoutsView.vue', 'utf8')

    expect(component).toContain('getCurrentLocalYearMonth()')
    expect(component).toContain('const visibleMonth = ref({ ...currentLocalMonth })')
    expect(component).toContain('function previousMonth()')
    expect(component).toContain('function nextMonth()')
    expect(component).toContain('if (!canGoNext.value) return')
    expect(component).toContain("'open-date': [date: string]")
    expect(component).not.toContain('session selector')

    expect(page).toContain('<WorkoutCalendar :sessions="workoutSessions" @open-date="openDate" />')
    expect(page).not.toContain('getCalendarMonthAggregates')
    expect(page).not.toContain('currentCalendarMonth')
  })
})

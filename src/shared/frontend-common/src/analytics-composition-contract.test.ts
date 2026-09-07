import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Analytics composition contract', () => {
  it('keeps period selector labels and summary cards in dedicated Svelte components', () => {
    const app = readFileSync('src/frontend/analytics-svelte/src/App.svelte', 'utf8')
    const period = readFileSync('src/frontend/analytics-svelte/src/AnalyticsPeriodPanel.svelte', 'utf8')
    const summary = readFileSync('src/frontend/analytics-svelte/src/AnalyticsSummary.svelte', 'utf8')

    for (const label of ['7 Days', '28 Days', 'Current Month', '3 Months', '6 Months', 'Entire Period']) {
      expect(period).toContain(label)
    }
    for (const value of ["'7d'", "'28d'", "'month'", "'3m'", "'6m'", "'all'"]) {
      expect(period).toContain(value)
    }

    expect(summary).toContain('Period workouts')
    expect(summary).toContain('Main Gym weight')
    expect(app).toContain('<AnalyticsSummary')
    expect(app).toContain('<AnalyticsPeriodPanel bind:selectedPeriod {periodRange} />')
    expect(app).not.toContain('const periodOptions')
  })
})

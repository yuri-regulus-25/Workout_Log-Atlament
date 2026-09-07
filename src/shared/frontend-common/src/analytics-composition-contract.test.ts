import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Analytics composition contract', () => {
  it('keeps period, summary, chart, and table presentation in dedicated Svelte components', () => {
    const app = readFileSync('src/frontend/analytics-svelte/src/App.svelte', 'utf8')
    const period = readFileSync('src/frontend/analytics-svelte/src/AnalyticsPeriodPanel.svelte', 'utf8')
    const summary = readFileSync('src/frontend/analytics-svelte/src/AnalyticsSummary.svelte', 'utf8')
    const charts = readFileSync('src/frontend/analytics-svelte/src/AnalyticsCharts.svelte', 'utf8')
    const tables = readFileSync('src/frontend/analytics-svelte/src/AnalyticsTables.svelte', 'utf8')

    for (const label of ['7 Days', '28 Days', 'Current Month', '3 Months', '6 Months', 'Entire Period']) {
      expect(period).toContain(label)
    }
    for (const value of ["'7d'", "'28d'", "'month'", "'3m'", "'6m'", "'all'"]) {
      expect(period).toContain(value)
    }

    expect(summary).toContain('Period workouts')
    expect(summary).toContain('Main Gym weight')
    expect(charts).toContain('ApexCharts')
    expect(charts).toContain('observeThemeChanges')
    expect(charts).toContain('createTrendOptions')
    expect(charts).toContain('createBodyPartOptions')
    expect(charts).toContain('colors: [chartTheme.accent]')
    expect(tables).toContain('Machine Variety')
    expect(tables).toContain('Body Part Volume - Main Gym')
    expect(tables).toContain('formatPercent')
    expect(app).toContain('<AnalyticsSummary')
    expect(app).toContain('<AnalyticsPeriodPanel bind:selectedPeriod {periodRange} />')
    expect(app).toContain('<AnalyticsCharts')
    expect(app).toContain('<AnalyticsTables')
    expect(app).not.toContain('ApexCharts')
    expect(app).not.toContain('createTrendOptions')
    expect(app).not.toContain('createBodyPartOptions')
    expect(app).not.toContain('const periodOptions')
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Dashboard composition contract', () => {
  it('keeps dashboard presentation in dedicated React components and modules', () => {
    const app = readFileSync('src/frontend/dashboard-react/src/App.tsx', 'utf8')
    const metric = readFileSync('src/frontend/dashboard-react/src/DashboardMetricCard.tsx', 'utf8')
    const recent = readFileSync('src/frontend/dashboard-react/src/RecentWorkoutsTable.tsx', 'utf8')
    const charts = readFileSync('src/frontend/dashboard-react/src/DashboardCharts.tsx', 'utf8')
    const sections = readFileSync('src/frontend/dashboard-react/src/DashboardSections.tsx', 'utf8')
    const bodyBalance = readFileSync('src/frontend/dashboard-react/src/dashboard-body-balance.ts', 'utf8')

    expect(metric).toContain('export function DashboardMetricCard')
    expect(metric).toContain('className="metric-card"')
    expect(recent).toContain('export function RecentWorkoutsTable')
    expect(recent).toContain('applicationRoutes.workouts')
    expect(recent).toContain('formatDisplayDate(row.date)')

    expect(charts).toContain('ReactApexChart')
    expect(charts).toContain('colors: [chartTheme.accent]')
    expect(charts).toContain('getUniqueWorkoutDateRoute')
    expect(sections).toContain('DashboardPrimarySection')
    expect(sections).toContain('DashboardLoadWarning')
    expect(sections).toContain('LatestWorkoutPanel')
    expect(bodyBalance).toContain('getDashboardBodyBalanceRows')
    expect(app).toContain('<DashboardMetricSection')
    expect(app).toContain('<DashboardRecentWorkoutsSection rows={recentRows} />')
    expect(app).not.toContain('ReactApexChart')
    expect(app).not.toContain('ApexOptions')
    expect(app).not.toContain('function MetricCard')
    expect(app).not.toContain('className="recent-table dashboard-recent-table"')
  })
})

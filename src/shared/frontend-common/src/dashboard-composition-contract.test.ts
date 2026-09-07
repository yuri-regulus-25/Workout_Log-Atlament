import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Dashboard composition contract', () => {
  it('keeps KPI cards and recent workout table as dedicated React presentation components', () => {
    const app = readFileSync('src/frontend/dashboard-react/src/App.tsx', 'utf8')
    const metric = readFileSync('src/frontend/dashboard-react/src/DashboardMetricCard.tsx', 'utf8')
    const recent = readFileSync('src/frontend/dashboard-react/src/RecentWorkoutsTable.tsx', 'utf8')

    expect(metric).toContain('export function DashboardMetricCard')
    expect(metric).toContain('className="metric-card"')
    expect(recent).toContain('export function RecentWorkoutsTable')
    expect(recent).toContain('applicationRoutes.workouts')
    expect(recent).toContain('formatDisplayDate(row.date)')

    expect(app).toContain('<DashboardMetricCard label="Monthly workouts"')
    expect(app).toContain('<RecentWorkoutsTable rows={recentRows} />')
    expect(app).not.toContain('function MetricCard')
    expect(app).not.toContain('className="recent-table dashboard-recent-table"')
  })
})

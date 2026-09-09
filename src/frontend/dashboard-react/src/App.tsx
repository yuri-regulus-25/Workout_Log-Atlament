import { useEffect, useRef, useState } from 'react'
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import { observeThemeChanges } from '@workout-lab/design-tokens'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import type { WorkoutSession } from '@workout-lab/workout-types'
import {
  formatDisplayDate,
  getCurrentLocalYearMonth,
  getMainGymMonthlyVolumeMetric,
  getMainGymVolumeTrendMetric,
  getNumericDelta,
  getMonthlySessions,
  getRecentSessions,
  resolveMainGymContext,
  resolvePreviousMonthRange,
  filterSessionsByDateRange,
  getTotalSets,
  toWorkoutRows,
} from '@workout-lab/workout-core'
import { getDashboardBodyBalanceRows } from './dashboard-body-balance'
import {
  DashboardChartSection,
  DashboardLoadWarning,
  DashboardMetricSection,
  DashboardPrimarySection,
  DashboardRecentWorkoutsSection,
} from './DashboardSections'
import './App.css'

/**
 * Dashboard の Composition Root。
 *
 * この component は Runtime Data の取得、最上位 state、月次/直近期間の派生値、
 * Application Shell の navigation/theme lifecycle を所有する。
 * Chart や panel の表示責務は `DashboardSections` と `DashboardCharts` へ委譲し、
 * ここでは画面全体の composition と data flow だけを追える状態にする。
 */
function App() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [mainGymContext, setMainGymContext] = useState<ReturnType<typeof resolveMainGymContext>>({
    state: 'unconfigured',
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [, setThemeRevision] = useState(0)
  const shellRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const navigation = initializeAppNavigation({
      currentRouteId: 'dashboard',
      shell: shellRef.current,
      screen: {
        eyebrow: 'Atlament / Dashboard',
        title: 'Dashboard',
        description: ['今のトレーニングを知る', '現在のトレーニング状況を確認します'],
        ariaLabel: 'Atlament Dashboard',
      },
    })

    return () => {
      navigation.dispose()
    }
  }, [])

  useEffect(() => {
    let active = true

    loadRuntimeWorkoutSessions()
      .then((result) => {
        if (!active) {
          return
        }

        setSessions(result.sessions)
        setMainGymContext(result.masterData ? resolveMainGymContext(result.masterData.gyms) : { state: 'unconfigured' })
        setLoadError(result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null)
      })
      .catch((error) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Workout data could not be loaded.')
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => observeThemeChanges(() => setThemeRevision((revision) => revision + 1)), [])

  const currentMonth = getCurrentLocalYearMonth()
  const monthlySessions = getMonthlySessions(sessions, currentMonth.year, currentMonth.month)
  const latestWorkout = sessions.at(-1)
  const totalSets = monthlySessions.reduce((total, session) => total + getTotalSets(session), 0)
  const monthlyVolume = getMainGymMonthlyVolumeMetric(mainGymContext, sessions, currentMonth.year, currentMonth.month)
  const previousMonthRange = resolvePreviousMonthRange(currentMonth.year, currentMonth.month)
  const previousMonthSessions = filterSessionsByDateRange(sessions, previousMonthRange)
  const monthlyWorkoutDelta = getNumericDelta(monthlySessions.length, previousMonthSessions.length)
  const monthlySetDelta = getNumericDelta(
    totalSets,
    previousMonthSessions.reduce((total, session) => total + getTotalSets(session), 0),
  )
  const recentRows = toWorkoutRows(sessions).slice(-5).reverse()
  const bodyBalanceRows = getDashboardBodyBalanceRows(monthlySessions)
  const recent28Sessions = getRecentSessions(sessions, 28)
  const mainGymVolumeTrend = getMainGymVolumeTrendMetric(mainGymContext, recent28Sessions)
  const mainGymVolumeTrendPoints = mainGymVolumeTrend.state === 'available' ? mainGymVolumeTrend.value : []
  const monthlySummaryMetrics = [
    { label: 'Monthly workouts', value: `${monthlySessions.length} Sessions` },
    { label: 'Monthly sets', value: `${totalSets} Sets` },
    { label: 'Main Gym volume', value: formatMainGymMetric(monthlyVolume) },
    { label: 'Latest workout', value: latestWorkout ? formatDisplayDate(latestWorkout.date) : '—' },
  ]
  const previousMonthMetrics = [
    { label: 'Workout delta', value: formatDelta(monthlyWorkoutDelta.absolute, 'Sessions') },
    { label: 'Set delta', value: formatDelta(monthlySetDelta.absolute, 'Sets') },
    { label: 'Previous month workouts', value: `${previousMonthSessions.length} Sessions` },
    { label: 'Previous month period', value: previousMonthRange.startDate.slice(0, 7).replace('-', '/') },
  ]

  return (
    <main ref={shellRef} className={`app-shell ${pageTransitionClassName}`}>
      <div data-application-shell-content>
        <DashboardMetricSection label="Monthly summary" metrics={monthlySummaryMetrics} />
        <DashboardMetricSection label="Previous month comparison" metrics={previousMonthMetrics} />
        <DashboardLoadWarning loadError={loadError} />
        <DashboardPrimarySection
          latestWorkout={latestWorkout}
          mainGymVolumeTrendState={mainGymVolumeTrend.state}
          mainGymVolumeTrendPoints={mainGymVolumeTrendPoints}
        />
        <DashboardChartSection sessions={recent28Sessions} bodyBalanceRows={bodyBalanceRows} />
        <DashboardRecentWorkoutsSection rows={recentRows} />
      </div>
    </main>
  )
}

function formatDelta(value: number, unit: string): string {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toLocaleString()} ${unit}`
}

function formatMainGymMetric(metric: ReturnType<typeof getMainGymMonthlyVolumeMetric>): string {
  return metric.state === 'available' ? `${metric.value.toLocaleString()} kg` : formatMainGymMetricState(metric)
}

function formatMainGymMetricState(metric: { state: string }): string {
  if (metric.state === 'unconfigured') {
    return 'Not Set'
  }

  if (metric.state === 'invalid') {
    return 'Unavailable'
  }

  return 'No Data'
}

export default App


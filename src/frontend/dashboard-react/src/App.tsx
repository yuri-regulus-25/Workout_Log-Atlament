import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useEffect, useRef, useState } from 'react'
import { applicationRoutes, initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import { initializeCharacterEasterEgg } from '@workout-lab/frontend-common/easter-egg'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import type { WorkoutSession } from '@workout-lab/workout-types'
import {
  formatBodyPart,
  formatDisplayDate,
  getBodyPartSummary,
  getMonthlySessions,
  getMonthlyVolume,
  getRecentSessions,
  getTotalSets,
  getTotalVolume,
  toWorkoutRows,
} from '@workout-lab/workout-core'
import './App.css'

const currentYear = 2026
const currentMonth = 8

function App() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const shellRef = useRef<HTMLElement | null>(null)
  const characterTriggerRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    const navigation = initializeAppNavigation({
      currentRouteId: 'dashboard',
      shell: shellRef.current,
    })
    const characterEasterEgg = initializeCharacterEasterEgg({
      trigger: characterTriggerRef.current,
      host: document.body,
      assetBasePath: '/frontend-common/easter-egg/assets/',
    })

    return () => {
      navigation.dispose()
      characterEasterEgg.dispose()
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

  const monthlySessions = getMonthlySessions(sessions, currentYear, currentMonth)
  const latestWorkout = sessions.at(-1)
  const totalSets = monthlySessions.reduce((total, session) => total + getTotalSets(session), 0)
  const monthlyVolume = getMonthlyVolume(sessions, currentYear, currentMonth)
  const recentRows = toWorkoutRows(sessions).slice(-5).reverse()
  const bodyBalanceRows = getDashboardBodyBalanceRows(monthlySessions)
  const recent28Sessions = getRecentSessions(sessions, 28)

  const volumeChartOptions: ApexOptions = {
    chart: {
      type: 'area',
      height: 320,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#7c3aed'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      categories: recent28Sessions.map((session) => formatDisplayDate(session.date)),
      labels: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value) => `${Math.round(value).toLocaleString()} kg`,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${value.toLocaleString()} kg`,
      },
    },
  }

  const volumeChartSeries = [
    {
      name: 'Total Weight',
      data: recent28Sessions.map((session) => getTotalVolume(session)),
    },
  ]
  const volumeChartKey = recent28Sessions.map((session) => session.session_id).join('|')

  const frequencyChartOptions: ApexOptions = {
    chart: { toolbar: { show: false } },
    colors: ['#2563eb'],
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '42%',
      },
    },
    xaxis: {
      categories: sessions.map((session) => formatDisplayDate(session.date).slice(5)),
      labels: { show: false },
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: (value) => `${Math.round(value)} sets`,
      },
    },
  }

  const frequencyChartSeries = [
    {
      name: 'Sets',
      data: sessions.map((session) => getTotalSets(session)),
    },
  ]

  const bodyBalanceChartOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
    },
    colors: ['#7c3aed'],
    dataLabels: {
      enabled: false,
    },
    grid: { show: false },
    plotOptions: {
      bar: {
        borderRadius: 8,
        barHeight: '62%',
        horizontal: true,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${Math.round(Number(value))} sets`,
      },
    },
    xaxis: {
      categories: bodyBalanceRows.map((row) => row.label),
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#475569',
          fontWeight: 800,
        },
      },
    },
  }

  const bodyBalanceChartSeries = [
    {
      name: 'Sets',
      data: bodyBalanceRows.map((row) => row.sets),
    },
  ]

  return (
    <main ref={shellRef} className={`app-shell ${pageTransitionClassName}`}>
      <header className="page-hero">
        <div className="hero-top">
          <div className="atl-brand-row" aria-label="Atlament Dashboard">
            <p ref={characterTriggerRef} className="eyebrow atl-character-trigger">Atlament / Dashboard</p>
          </div>
        </div>
        <h1>Dashboard</h1>
        <p className="lead">
          今のトレーニングを知る<br />
          現在の状態を把握することは、己を知ることになる
        </p>
      </header>

      <section className="metric-grid" aria-label="Monthly summary">
        <MetricCard label="Monthly workouts" value={`${monthlySessions.length} Sessions`} />
        <MetricCard label="Monthly sets" value={`${totalSets} Sets`} />
        <MetricCard label="Monthly volume" value={`${monthlyVolume.toLocaleString()} kg`} />
        <MetricCard label="Latest workout" value={latestWorkout ? formatDisplayDate(latestWorkout.date) : '—'} />
      </section>

      {loadError ? (
        <section className="panel">
          <p className="eyebrow">Data Load Warning</p>
          <h2>ワークアウトデータを確認してください</h2>
          <p className="muted">{loadError}</p>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <article className="panel wide">
          <div className="panel-header">
            <div className="card-heading">
              <div className="card-heading__icon"><i className="mdi mdi-chart-areaspline" aria-hidden="true"></i></div>
              <div className="card-heading__text">
                <p className="eyebrow">Volume Trends</p>
                <h2>ボリューム推移</h2>
              </div>
            </div>
            <a href={applicationRoutes.analytics} className="text-link">
              View Analytics
            </a>
          </div>
          {recent28Sessions.length > 0 ? (
            <ReactApexChart
              key={volumeChartKey}
              type="area"
              height={320}
              options={volumeChartOptions}
              series={volumeChartSeries}
            />
          ) : (
            <p className="muted">No workout data loaded.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div className="card-heading">
              <div className="card-heading__icon"><i className="mdi mdi-calendar-blank-outline" aria-hidden="true"></i></div>
              <div className="card-heading__text">
                <p className="eyebrow">Latest Workout</p>
                <h2>{latestWorkout ? formatDisplayDate(latestWorkout.date) : 'No workout'}</h2>
              </div>
            </div>
          </div>
          {latestWorkout ? (
            <>
              <p className="large-number">{getTotalVolume(latestWorkout).toLocaleString()} kg</p>
              <p className="muted">
                {latestWorkout.gym.name}<br />
                {getTotalSets(latestWorkout)} sets<br />
                {latestWorkout.exercises.length} machines
              </p>
              <a className="primary-action" href={`${applicationRoutes.workouts}${latestWorkout.date}/`}>
                View Workout Detail
              </a>
            </>
          ) : (
            <p className="muted">No workout data loaded.</p>
          )}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div className="card-heading">
              <div className="card-heading__icon"><i className="mdi mdi-chart-bar" aria-hidden="true"></i></div>
              <div className="card-heading__text">
                <p className="eyebrow">Set Count Trends</p>
                <h2>セット数推移</h2>
              </div>
            </div>
          </div>
          <ReactApexChart
            type="bar"
            height={300}
            options={frequencyChartOptions}
            series={frequencyChartSeries}
          />
        </article>

        <article className="panel">
          <div className="panel-header">
            <div className="card-heading">
              <div className="card-heading__icon"><i className="mdi mdi-scale-balance" aria-hidden="true"></i></div>
              <div className="card-heading__text">
                <p className="eyebrow">Training Balance</p>
                <h2>トレーニングバランス</h2>
              </div>
            </div>
          </div>
          <ReactApexChart
            type="bar"
            height={300}
            options={bodyBalanceChartOptions}
            series={bodyBalanceChartSeries}
          />
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="card-heading">
            <div className="card-heading__icon"><i className="mdi mdi-history" aria-hidden="true"></i></div>
            <div className="card-heading__text">
              <p className="eyebrow">Recent Workouts</p>
              <h2>最近のワークアウト</h2>
            </div>
          </div>
          <a href={applicationRoutes.workouts} className="text-link">
            View Workout Domain
          </a>
        </div>
        <div className="recent-table dashboard-recent-table">
          <div className="recent-row header">
            <span className="date-cell">Date</span>
            <span className="gym-cell">Gym</span>
            <span className="machines-cell">Machines</span>
            <span className="sets-cell">Sets</span>
            <span className="volume-cell">Volume</span>
          </div>
          {recentRows.map((row) => (
            <a key={row.sessionId} className="recent-row" href={`${applicationRoutes.workouts}${row.date}/`}>
              <span className="date-cell">{formatDisplayDate(row.date)}</span>
              <span className="gym-cell">{row.gym}</span>
              <span className="machines-cell">{row.exerciseCount}</span>
              <span className="sets-cell">{row.totalSets}</span>
              <span className="volume-cell">{row.totalVolume.toLocaleString()} kg</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

const dashboardBodyPartOrder = ['shoulders', 'arms', 'chest', 'core', 'back', 'glutes', 'legs']

function getDashboardBodyBalanceRows(monthlySessions: WorkoutSession[]) {
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

export default App


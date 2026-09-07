import type { WorkoutSession } from '@workout-lab/workout-types'
import {
  formatDisplayDate,
  getGymDisplayName,
  getTotalSets,
  getTotalVolume,
} from '@workout-lab/workout-core'
import { BodyBalanceChart, MainGymVolumeChart, WorkoutFrequencyChart } from './DashboardCharts'
import { DashboardMetricCard } from './DashboardMetricCard'
import { RecentWorkoutsTable } from './RecentWorkoutsTable'

type Metric = {
  label: string
  value: string
}

type BodyBalanceRow = {
  label: string
  sets: number
}

type MainGymVolumeTrendPoint = {
  sessionId: string
  date: string
  volume: number
}

export function DashboardMetricSection(props: { label: string; metrics: Metric[] }) {
  return (
    <section className="metric-grid" aria-label={props.label}>
      {props.metrics.map((metric) => (
        <DashboardMetricCard key={metric.label} label={metric.label} value={metric.value} />
      ))}
    </section>
  )
}

export function DashboardLoadWarning(props: { loadError: string | null }) {
  if (!props.loadError) return null

  return (
    <section className="panel">
      <p className="eyebrow">Data Load Warning</p>
      <h2>データ取得異常</h2>
      <p className="muted">データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください</p>
    </section>
  )
}

export function DashboardPrimarySection(props: {
  latestWorkout?: WorkoutSession
  mainGymVolumeTrendState: string
  mainGymVolumeTrendPoints: MainGymVolumeTrendPoint[]
}) {
  return (
    <section className="dashboard-grid">
      <article className="panel wide">
        <DashboardPanelHeading icon="mdi-chart-areaspline" eyebrow="Volume Trends - Main Gym" title="ボリューム推移 - メインジム" />
        <MainGymVolumeChart state={props.mainGymVolumeTrendState} points={props.mainGymVolumeTrendPoints} />
      </article>

      <LatestWorkoutPanel latestWorkout={props.latestWorkout} />
    </section>
  )
}

export function DashboardChartSection(props: {
  sessions: WorkoutSession[]
  bodyBalanceRows: BodyBalanceRow[]
}) {
  return (
    <section className="dashboard-grid">
      <article className="panel">
        <DashboardPanelHeading icon="mdi-chart-bar" eyebrow="Set Count Trends" title="セット数推移" />
        <WorkoutFrequencyChart sessions={props.sessions} />
      </article>

      <article className="panel">
        <DashboardPanelHeading icon="mdi-scale-balance" eyebrow="Training Balance" title="トレーニングバランス" />
        <BodyBalanceChart rows={props.bodyBalanceRows} />
      </article>
    </section>
  )
}

export function DashboardRecentWorkoutsSection(props: { rows: Parameters<typeof RecentWorkoutsTable>[0]['rows'] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <DashboardPanelTitle icon="mdi-history" eyebrow="Recent Workouts" title="最近のワークアウト" />
      </div>
      <RecentWorkoutsTable rows={props.rows} />
    </section>
  )
}

function LatestWorkoutPanel(props: { latestWorkout?: WorkoutSession }) {
  if (!props.latestWorkout) {
    return (
      <article className="panel latest-workout-empty">
        <DashboardPanelHeading icon="mdi-calendar-blank-outline" eyebrow="Latest Workout" title="No workout" />
        <p className="muted">データがありません</p>
      </article>
    )
  }

  return (
    <article className="panel latest-workout-empty">
      <DashboardPanelHeading icon="mdi-calendar-blank-outline" eyebrow="Latest Workout" title={formatDisplayDate(props.latestWorkout.date)} />
      <p className="large-number">{getTotalVolume(props.latestWorkout).toLocaleString()} kg</p>
      <p className="muted">
        {getGymDisplayName(props.latestWorkout.gym)}<br />
        {getTotalSets(props.latestWorkout)} sets<br />
        {props.latestWorkout.machines.length} machines
      </p>
    </article>
  )
}

function DashboardPanelHeading(props: { icon: string; eyebrow: string; title: string }) {
  return (
    <div className="panel-header">
      <DashboardPanelTitle {...props} />
    </div>
  )
}

function DashboardPanelTitle(props: { icon: string; eyebrow: string; title: string }) {
  return (
    <div className="card-heading">
      <div className="card-heading__icon"><i className={`mdi ${props.icon}`} aria-hidden="true"></i></div>
      <div className="card-heading__text">
        <p className="eyebrow">{props.eyebrow}</p>
        <h2>{props.title}</h2>
      </div>
    </div>
  )
}

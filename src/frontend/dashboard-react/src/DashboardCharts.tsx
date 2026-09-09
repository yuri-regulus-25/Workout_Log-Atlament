import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { getChartTheme } from '@workout-lab/design-tokens'
import { formatDisplayDate, getTotalSets } from '@workout-lab/workout-core'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { getUniqueWorkoutDateRoute } from './dashboard-navigation'

type MainGymVolumeTrendPoint = {
  sessionId: string
  date: string
  volume: number
}

type BodyBalanceRow = {
  label: string
  sets: number
}

/**
 * Main Gym の volume trend を ApexCharts へ変換して表示する。
 *
 * `state` が available ではない場合、App 側ではなく Chart component 側で empty presentation を担う。
 */
export function MainGymVolumeChart(props: {
  state: string
  points: MainGymVolumeTrendPoint[]
}) {
  if (props.state !== 'available' || props.points.length === 0) {
    return <p className="muted">データがありません</p>
  }

  const chart = createVolumeChart(props.points)
  return (
    <ReactApexChart
      key={props.points.map((point) => point.sessionId).join('|')}
      type="area"
      height={320}
      options={chart.options}
      series={chart.series}
    />
  )
}

/**
 * 直近 session の set count 推移を表示する Chart presentation。
 *
 * bar selection は日付が一意に解決できる場合だけ Workout Detail へ遷移する。
 */
export function WorkoutFrequencyChart(props: { sessions: WorkoutSession[] }) {
  const chart = createFrequencyChart(props.sessions)
  return <ReactApexChart type="bar" height={300} options={chart.options} series={chart.series} />
}

/**
 * 月内の body part balance を表示する Chart presentation。
 */
export function BodyBalanceChart(props: { rows: BodyBalanceRow[] }) {
  const chart = createBodyBalanceChart(props.rows)
  return <ReactApexChart type="bar" height={300} options={chart.options} series={chart.series} />
}

/**
 * Design Token の chart theme を ApexCharts option へ写像する。
 *
 * Theme 切替時は呼び出し component が再評価し、Portal/Shell と同じ token source を使う。
 */
function createVolumeChart(points: MainGymVolumeTrendPoint[]) {
  const chartTheme = getChartTheme()
  const options: ApexOptions = {
    chart: {
      type: 'area',
      height: 320,
      background: 'transparent',
      foreColor: chartTheme.textMuted,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [chartTheme.primary],
    dataLabels: { enabled: false },
    fill: {
      gradient: {
        opacityFrom: chartTheme.mode === 'dark' ? 0.34 : 0.28,
        opacityTo: chartTheme.mode === 'dark' ? 0.04 : 0.02,
      },
      type: 'gradient',
    },
    grid: { borderColor: chartTheme.grid },
    stroke: { curve: 'smooth', width: 3 },
    theme: { mode: chartTheme.mode },
    xaxis: {
      categories: points.map((point) => formatDisplayDate(point.date)),
      axisBorder: { color: chartTheme.border },
      axisTicks: { color: chartTheme.border },
      labels: { show: false, style: { colors: chartTheme.textMuted } },
    },
    yaxis: {
      labels: {
        formatter: (value) => `${Math.round(value).toLocaleString()} kg`,
        style: { colors: chartTheme.textMuted },
      },
    },
    tooltip: {
      theme: chartTheme.mode,
      y: {
        formatter: (value) => `${value.toLocaleString()} kg`,
      },
    },
  }

  return {
    options,
    series: [{ name: 'Main Gym Total Weight', data: points.map((point) => point.volume) }],
  }
}

function createFrequencyChart(sessions: WorkoutSession[]) {
  const chartTheme = getChartTheme()
  const options: ApexOptions = {
    chart: {
      background: 'transparent',
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          const dataPointIndex = config?.dataPointIndex
          if (typeof dataPointIndex !== 'number') {
            return
          }

          const route = getUniqueWorkoutDateRoute(sessions, dataPointIndex)
          if (route) {
            window.location.assign(route)
          }
        },
      },
      foreColor: chartTheme.textMuted,
      toolbar: { show: false },
    },
    colors: [chartTheme.accent],
    dataLabels: { enabled: false },
    grid: { borderColor: chartTheme.grid },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '42%',
      },
    },
    xaxis: {
      categories: sessions.map((session) => formatDisplayDate(session.date).slice(5)),
      axisBorder: { color: chartTheme.border },
      axisTicks: { color: chartTheme.border },
      labels: { show: false, style: { colors: chartTheme.textMuted } },
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: (value) => `${Math.round(value)} sets`,
        style: { colors: chartTheme.textMuted },
      },
    },
    theme: { mode: chartTheme.mode },
    tooltip: { theme: chartTheme.mode },
  }

  return {
    options,
    series: [{ name: 'Sets', data: sessions.map((session) => getTotalSets(session)) }],
  }
}

function createBodyBalanceChart(rows: BodyBalanceRow[]) {
  const chartTheme = getChartTheme()
  const options: ApexOptions = {
    chart: {
      background: 'transparent',
      foreColor: chartTheme.textMuted,
      toolbar: { show: false },
    },
    colors: [chartTheme.primary],
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
      theme: chartTheme.mode,
      y: {
        formatter: (value) => `${Math.round(Number(value))} sets`,
      },
    },
    xaxis: {
      categories: rows.map((row) => row.label),
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: chartTheme.textMuted,
          fontWeight: 800,
        },
      },
    },
    theme: { mode: chartTheme.mode },
  }

  return {
    options,
    series: [{ name: 'Sets', data: rows.map((row) => row.sets) }],
  }
}

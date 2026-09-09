<script lang="ts">
  import ApexCharts from 'apexcharts'
  import type { ApexOptions } from 'apexcharts'
  import { onDestroy, onMount, tick } from 'svelte'
  import { getChartTheme, observeThemeChanges } from '@workout-lab/design-tokens'
  import { formatBodyPart, formatDisplayDate } from '@workout-lab/workout-core'

  type TrendPoint = {
    sessionId: string
    date: string
    volume: number
  }

  type BodyPartSummaryRow = {
    bodyPart: string
    sets: number
  }

  export let trendPoints: TrendPoint[] = []
  export let bodyPartSummaryRows: BodyPartSummaryRow[] = []

  /**
   * Analytics chart presentation。
   *
   * ApexCharts の lifecycle と Design Token からの theme adaptation をこの component に閉じる。
   * App は trend/bodyPart rows を渡すだけで、chart instance の生成・破棄・更新順序を知らなくてよい。
   */
  $: trendReady = trendPoints.length > 0
  $: trendKey = trendPoints.map((point) => point.sessionId).join('|')
  $: void syncTrendChart(trendReady, trendKey)
  $: if (bodyPartChart) {
    bodyPartChart.updateOptions(createBodyPartOptions(bodyPartSummaryRows), false, true)
  }

  let trendChartElement: HTMLDivElement | null = null
  let bodyPartChartElement: HTMLDivElement
  let trendChart: ApexCharts | null = null
  let bodyPartChart: ApexCharts | null = null
  let renderedTrendKey = ''
  let trendChartSyncRequest = 0
  let disposeThemeObserver: (() => void) | null = null

  onMount(() => {
    disposeThemeObserver = observeThemeChanges(() => {
      void syncTrendChart(trendReady, trendKey)
      bodyPartChart?.updateOptions(createBodyPartOptions(bodyPartSummaryRows), false, true)
    })

    bodyPartChart = new ApexCharts(
      bodyPartChartElement,
      createBodyPartOptions(bodyPartSummaryRows),
    )
    bodyPartChart.render()
  })

  onDestroy(() => {
    disposeThemeObserver?.()
    trendChart?.destroy()
    bodyPartChart?.destroy()
  })

  /**
   * Svelte の DOM 更新後に trend chart を生成または更新する。
   *
   * reactive statement が連続して走るため、request number で古い同期要求を破棄し、
   * destroy 済み要素へ render しないようにする。
   */
  async function syncTrendChart(ready: boolean, key: string): Promise<void> {
    const request = ++trendChartSyncRequest
    await tick()

    if (request !== trendChartSyncRequest) {
      return
    }

    if (!ready || !trendChartElement) {
      trendChart?.destroy()
      trendChart = null
      renderedTrendKey = ''
      return
    }

    if (!trendChart || renderedTrendKey !== key) {
      trendChart?.destroy()
      trendChart = new ApexCharts(trendChartElement, createTrendOptions(trendPoints))
      renderedTrendKey = key
      await trendChart.render()
      return
    }

    await trendChart.updateOptions(createTrendOptions(trendPoints), false, true)
  }

  function createTrendOptions(points: TrendPoint[]): ApexOptions {
    const chartTheme = getChartTheme()

    return {
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
      series: [
        {
          name: 'Main Gym Total Weight',
          data: points.map((point) => point.volume),
        },
      ],
      xaxis: {
        categories: points.map((point) => formatDisplayDate(point.date)),
        axisBorder: { color: chartTheme.border },
        axisTicks: { color: chartTheme.border },
        labels: { show: false, style: { colors: chartTheme.textMuted } },
      },
      tooltip: {
        theme: chartTheme.mode,
        y: {
          formatter: (value) => `${value.toLocaleString()} kg`,
        },
      },
    }
  }

  function createBodyPartOptions(rows: BodyPartSummaryRow[]): ApexOptions {
    const chartTheme = getChartTheme()

    return {
      chart: {
        type: 'bar',
        height: 320,
        background: 'transparent',
        foreColor: chartTheme.textMuted,
        toolbar: { show: false },
      },
      colors: [chartTheme.accent],
      dataLabels: { enabled: false },
      grid: { borderColor: chartTheme.grid },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '44%',
        },
      },
      series: [
        {
          name: 'Sets',
          data: rows.map((item) => item.sets),
        },
      ],
      xaxis: {
        categories: rows.map((item) => formatBodyPart(item.bodyPart)),
        axisBorder: { color: chartTheme.border },
        axisTicks: { color: chartTheme.border },
        labels: { style: { colors: chartTheme.textMuted } },
      },
      yaxis: {
        labels: { style: { colors: chartTheme.textMuted } },
      },
      theme: { mode: chartTheme.mode },
      tooltip: { theme: chartTheme.mode },
    }
  }
</script>

<section class="analytics-chart-grid">
  <article class="panel">
    <div class="panel-header">
      <div class="card-heading">
        <div class="card-heading__icon"><i class="mdi mdi-chart-bell-curve" aria-hidden="true"></i></div>
        <div class="card-heading__text">
          <p class="eyebrow">Main Gym Workout Trend</p>
          <h2>ボリューム推移</h2>
        </div>
      </div>
    </div>
    {#if trendReady}
      {#key trendKey}
        <div bind:this={trendChartElement}></div>
      {/key}
    {:else}
      <p class="muted">データがありません</p>
    {/if}
  </article>

  <article class="panel">
    <div class="panel-header">
      <div class="card-heading">
        <div class="card-heading__icon"><i class="mdi mdi-chart-bar" aria-hidden="true"></i></div>
        <div class="card-heading__text">
          <p class="eyebrow">Body Part Balance</p>
          <h2>部位別セット数</h2>
        </div>
      </div>
    </div>
    <div bind:this={bodyPartChartElement}></div>
  </article>
</section>

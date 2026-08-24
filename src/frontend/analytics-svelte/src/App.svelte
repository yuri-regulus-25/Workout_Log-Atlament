<script lang="ts">
  import ApexCharts from 'apexcharts'
  import type { ApexOptions } from 'apexcharts'
  import { onDestroy, onMount } from 'svelte'
  import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
  import type { WorkoutSession } from '@workout-lab/workout-types'
  import {
    formatBodyPart,
    formatDisplayDate,
    getAverageSessionIntervalDays,
    getBodyPartSummary,
    getBodyPartMachineVariety,
    getRecentSessions,
    getTrainingFrequencyPerWeek,
    getTotalSets,
    getTotalVolume,
  } from '@workout-lab/workout-core'

  let sessions: WorkoutSession[] = []
  let loadError: string | null = null
  $: bodyPartSummary = getBodyPartSummary(sessions)
  $: bodyPartSummaryRows = orderByBodyPartDisplayOrder(bodyPartSummary)
  $: recent28Sessions = getRecentSessions(sessions, 28)
  $: machineVarietyRows = orderByBodyPartDisplayOrder(getBodyPartMachineVariety(recent28Sessions))
  $: totalSets = sessions.reduce((total, session) => total + getTotalSets(session), 0)
  $: totalVolume = sessions.reduce((total, session) => total + getTotalVolume(session), 0)
  $: trainingFrequencyPerWeek = getTrainingFrequencyPerWeek(sessions)
  $: averageIntervalDays = getAverageSessionIntervalDays(sessions)
  $: averageInterval = averageIntervalDays === null ? '—' : `${averageIntervalDays.toFixed(1)} days`

  let trendChartElement: HTMLDivElement
  let bodyPartChartElement: HTMLDivElement
  let trendChart: ApexCharts | null = null
  let bodyPartChart: ApexCharts | null = null

  onMount(async () => {
    try {
      const result = await loadRuntimeWorkoutSessions()
      sessions = result.sessions
      loadError = result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Workout data could not be loaded.'
    }

    trendChart = new ApexCharts(trendChartElement, createTrendOptions(sessions))
    bodyPartChart = new ApexCharts(
      bodyPartChartElement,
      createBodyPartOptions(orderByBodyPartDisplayOrder(getBodyPartSummary(sessions))),
    )

    trendChart.render()
    bodyPartChart.render()
  })

  onDestroy(() => {
    trendChart?.destroy()
    bodyPartChart?.destroy()
  })

  function createTrendOptions(sourceSessions: WorkoutSession[]): ApexOptions {
    return {
      chart: {
        type: 'area',
        height: 320,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ['#7c3aed'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      series: [
        {
          name: 'Total Weight',
          data: sourceSessions.map((session) => getTotalVolume(session)),
        },
      ],
      xaxis: {
        categories: sourceSessions.map((session) => formatDisplayDate(session.date)),
        labels: { show: false },
      },
      tooltip: {
        y: {
          formatter: (value) => `${value.toLocaleString()} kg`,
        },
      },
    }
  }

  function createBodyPartOptions(sourceSummary: ReturnType<typeof getBodyPartSummary>): ApexOptions {
    return {
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
      },
      colors: ['#2563eb'],
      dataLabels: { enabled: false },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '44%',
        },
      },
      series: [
        {
          name: 'Sets',
          data: sourceSummary.map((item) => item.sets),
        },
      ],
      xaxis: {
        categories: sourceSummary.map((item) => formatBodyPart(item.bodyPart)),
      },
    }
  }

  const bodyPartDisplayOrder = ['shoulders', 'arms', 'chest', 'core', 'back', 'glutes', 'legs'] as const

  function orderByBodyPartDisplayOrder<T extends { bodyPart: string }>(rows: T[]): T[] {
    const order = new Map<string, number>(bodyPartDisplayOrder.map((bodyPart, index) => [bodyPart, index]))

    return [...rows].sort(
      (a, b) =>
        (order.get(a.bodyPart) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.bodyPart) ?? Number.MAX_SAFE_INTEGER),
    )
  }
</script>

<main class="app-shell">
  <header class="page-hero">
    <div class="hero-top">
      <p class="eyebrow">Atlament / Analytics</p>
      <nav class="global-nav" aria-label="Global navigation">
        <a href="/dashboard/">Dashboard</a>
        <a href="/workouts/">Workouts</a>
        <a class="active" href="/analytics/">Analytics</a>
      </nav>
    </div>
    <h1>Analytics</h1>
    <p class="lead">
      データから傾向を見つける<br />
      傾向を見つけることで、さらなる進化になる
    </p>
  </header>

  <section class="metric-grid" aria-label="Analytics summary">
    <article class="metric-card">
      <span>Monthly workouts</span>
      <strong>{sessions.length} {sessions.length > 1 ? "Sessions" : "Session"}</strong>
    </article>
    <article class="metric-card">
      <span>Total sets</span>
      <strong>{totalSets} {totalSets > 1 ? "Sets" : "Set"}</strong>
    </article>
    <article class="metric-card">
      <span>Total weight</span>
      <strong>{totalVolume.toLocaleString()} kg</strong>
    </article>
    <article class="metric-card">
      <span>Average interval</span>
      <strong>{averageInterval}</strong>
    </article>
  </section>

  {#if loadError}
    <section class="panel">
      <p class="eyebrow">Data Load Warning</p>
      <h2>ワークアウトデータを確認してください</h2>
      <p class="muted">{loadError}</p>
    </section>
  {/if}

  <section class="analytics-chart-grid">
    <article class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Workout Trend</p>
          <h2>ボリューム推移</h2>
        </div>
      </div>
      <div bind:this={trendChartElement}></div>
    </article>

    <article class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Body Part Balance</p>
          <h2>部位別セット数</h2>
        </div>
      </div>
      <div bind:this={bodyPartChartElement}></div>
    </article>
  </section>

  <section class="analytics-single-grid">
    <article class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Training Frequency</p>
          <h2>トレーニング頻度</h2>
        </div>
      </div>
      <p class="large-number">{trainingFrequencyPerWeek.toFixed(1)} / week</p>
      <p class="muted">
        記録期間全体での週あたり平均セッション数。
      </p>
      <a class="primary-action" href="/dashboard/">Back to Dashboard</a>
    </article>
  </section>

  <section class="dashboard-grid analytics-table-grid">
    <article class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Machine Variety</p>
          <h2>部位別実施マシン数</h2>
        </div>
      </div>
      <div class="summary-table machine-variety-table">
        <div class="summary-row header">
          <span>Body Part</span>
          <span>Machines</span>
        </div>
        {#each machineVarietyRows as row}
          <div class="summary-row">
            <span>{formatBodyPart(row.bodyPart)}</span>
            <span>{row.machineCount}</span>
          </div>
        {:else}
          <p class="muted">直近28日間の実施マシンはありません。</p>
        {/each}
      </div>
    </article>

    <article class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Body Part Volume</p>
          <h2>部位別ボリューム</h2>
        </div>
      </div>
      <div class="summary-table">
        <div class="summary-row header">
          <span>Body Part</span>
          <span>Sets</span>
          <span>Total Weight</span>
        </div>
        {#each bodyPartSummaryRows as item}
          <div class="summary-row">
            <span>{formatBodyPart(item.bodyPart)}</span>
            <span>{item.sets}</span>
            <span>{item.volume.toLocaleString()} kg</span>
          </div>
        {/each}
      </div>
    </article>
  </section>
</main>

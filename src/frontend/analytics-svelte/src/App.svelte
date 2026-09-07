<script lang="ts">
  import ApexCharts from 'apexcharts'
  import type { ApexOptions } from 'apexcharts'
  import { onDestroy, onMount, tick } from 'svelte'
  import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
  import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
  import { initializeCharacterEasterEgg } from '@workout-lab/frontend-common/easter-egg'
  import { getChartTheme, observeThemeChanges } from '@workout-lab/design-tokens'
  import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
  import type { WorkoutMasterData, WorkoutSession } from '@workout-lab/workout-types'
  import AnalyticsPeriodPanel from './AnalyticsPeriodPanel.svelte'
  import AnalyticsSummary from './AnalyticsSummary.svelte'
  import {
    filterSessionsByDateRange,
    formatBodyPart,
    formatDisplayDate,
    getAverageSessionIntervalDays,
    getBodyPartShare,
    getBodyPartSummary,
    getLastTrainedDateByBodyPart,
    getMachineFrequencyRanking,
    getBodyPartMachineVariety,
    getMainGymSessionsMetric,
    getMainGymTotalVolumeMetric,
    getMainGymVolumeTrendMetric,
    getRecentSessions,
    getSessionsByGym,
    getSetsByBodyPart,
    getTrainingFrequencyPerWeek,
    getTotalSets,
    resolveMainGymContext,
    resolvePeriodRange,
  } from '@workout-lab/workout-core'
  import type { PeriodPreset } from '@workout-lab/workout-core'

  let sessions: WorkoutSession[] = []
  let masterData: WorkoutMasterData | undefined
  let selectedPeriod: PeriodPreset = '28d'
  let loadError: string | null = null
  $: periodRange = resolvePeriodRange(selectedPeriod, sessions)
  $: filteredSessions = filterSessionsByDateRange(sessions, periodRange)
  $: mainGymContext = masterData ? resolveMainGymContext(masterData.gyms) : { state: 'unconfigured' as const }
  $: mainGymFilteredSessions = getMainGymSessionsMetric(mainGymContext, filteredSessions)
  $: volumeMetricSessions = mainGymFilteredSessions.state === 'available' ? mainGymFilteredSessions.value : []
  $: bodyPartSummary = getBodyPartSummary(filteredSessions)
  $: bodyPartSummaryRows = orderByBodyPartDisplayOrder(bodyPartSummary)
  $: mainGymBodyPartSummaryRows = orderByBodyPartDisplayOrder(getBodyPartSummary(volumeMetricSessions))
  $: recent28Sessions = getRecentSessions(filteredSessions, 28)
  $: mainGymVolumeTrend = getMainGymVolumeTrendMetric(mainGymContext, recent28Sessions)
  $: mainGymVolumeTrendPoints = mainGymVolumeTrend.state === 'available' ? mainGymVolumeTrend.value : []
  $: mainGymVolumeTrendReady = mainGymVolumeTrend.state === 'available' && mainGymVolumeTrendPoints.length > 0
  $: mainGymVolumeTrendKey = mainGymVolumeTrendPoints.map((point) => point.sessionId).join('|')
  $: machineVarietyRows = orderByBodyPartDisplayOrder(getBodyPartMachineVariety(recent28Sessions))
  $: totalSets = filteredSessions.reduce((total, session) => total + getTotalSets(session), 0)
  $: totalVolume = getMainGymTotalVolumeMetric(mainGymContext, filteredSessions)
  $: trainingFrequencyPerWeek = getTrainingFrequencyPerWeek(filteredSessions)
  $: averageIntervalDays = getAverageSessionIntervalDays(filteredSessions)
  $: averageInterval = averageIntervalDays === null ? '—' : `${averageIntervalDays.toFixed(1)} days`
  $: bodyPartShareRows = orderByBodyPartDisplayOrder(getBodyPartShare(filteredSessions))
  $: bodyPartLastTrainedRows = orderByBodyPartDisplayOrder(getLastTrainedDateByBodyPart(filteredSessions))
  $: machineFrequencyRows = getMachineFrequencyRanking(filteredSessions).slice(0, 8)
  $: gymRows = getSessionsByGym(filteredSessions)
  $: bodyPartSetRows = orderByBodyPartDisplayOrder(getSetsByBodyPart(filteredSessions))
  $: void syncTrendChart(mainGymVolumeTrendReady, mainGymVolumeTrendKey)
  $: if (bodyPartChart) {
    bodyPartChart.updateOptions(createBodyPartOptions(bodyPartSummaryRows), false, true)
  }

  let trendChartElement: HTMLDivElement | null = null
  let bodyPartChartElement: HTMLDivElement
  let shellElement: HTMLElement
  let characterTriggerElement: HTMLParagraphElement
  let trendChart: ApexCharts | null = null
  let bodyPartChart: ApexCharts | null = null
  let renderedMainGymVolumeTrendKey = ''
  let trendChartSyncRequest = 0
  let navigation: { dispose: () => void } | null = null
  let characterEasterEgg: { dispose: () => void } | null = null
  let disposeThemeObserver: (() => void) | null = null

  onMount(async () => {
    navigation = initializeAppNavigation({
      currentRouteId: 'analytics',
      shell: shellElement,
    })
    characterEasterEgg = initializeCharacterEasterEgg({
      trigger: characterTriggerElement,
      host: document.body,
      assetBasePath: '/frontend-common/easter-egg/assets/',
    })
    disposeThemeObserver = observeThemeChanges(() => {
      void syncTrendChart(mainGymVolumeTrendReady, mainGymVolumeTrendKey)
      bodyPartChart?.updateOptions(createBodyPartOptions(bodyPartSummaryRows), false, true)
    })

    try {
      const result = await loadRuntimeWorkoutSessions()
      sessions = result.sessions
      masterData = result.masterData
      loadError = result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Workout data could not be loaded.'
    }

    bodyPartChart = new ApexCharts(
      bodyPartChartElement,
      createBodyPartOptions(bodyPartSummaryRows),
    )

    bodyPartChart.render()
  })

  onDestroy(() => {
    navigation?.dispose()
    characterEasterEgg?.dispose()
    disposeThemeObserver?.()
    trendChart?.destroy()
    bodyPartChart?.destroy()
  })

  async function syncTrendChart(ready: boolean, key: string): Promise<void> {
    const request = ++trendChartSyncRequest
    await tick()

    if (request !== trendChartSyncRequest) {
      return
    }

    if (!ready || !trendChartElement) {
      trendChart?.destroy()
      trendChart = null
      renderedMainGymVolumeTrendKey = ''
      return
    }

    if (!trendChart || renderedMainGymVolumeTrendKey !== key) {
      trendChart?.destroy()
      trendChart = new ApexCharts(trendChartElement, createTrendOptions(mainGymVolumeTrendPoints))
      renderedMainGymVolumeTrendKey = key
      await trendChart.render()
      return
    }

    await trendChart.updateOptions(createTrendOptions(mainGymVolumeTrendPoints), false, true)
  }

  function createTrendOptions(trendPoints: typeof mainGymVolumeTrendPoints): ApexOptions {
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
          data: trendPoints.map((point) => point.volume),
        },
      ],
      xaxis: {
        categories: trendPoints.map((point) => formatDisplayDate(point.date)),
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

  function createBodyPartOptions(sourceSummary: ReturnType<typeof getBodyPartSummary>): ApexOptions {
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
          data: sourceSummary.map((item) => item.sets),
        },
      ],
      xaxis: {
        categories: sourceSummary.map((item) => formatBodyPart(item.bodyPart)),
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

  const bodyPartDisplayOrder = ['shoulders', 'arms', 'chest', 'core', 'back', 'glutes', 'legs'] as const

  function orderByBodyPartDisplayOrder<T extends { bodyPart: string }>(rows: T[]): T[] {
    const order = new Map<string, number>(bodyPartDisplayOrder.map((bodyPart, index) => [bodyPart, index]))

    return [...rows].sort(
      (a, b) =>
        (order.get(a.bodyPart) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.bodyPart) ?? Number.MAX_SAFE_INTEGER),
    )
  }

  function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`
  }

  function formatMainGymMetric(metric: { state: string; value?: number }): string {
    return metric.state === 'available' && typeof metric.value === 'number'
      ? `${metric.value.toLocaleString()} kg`
      : formatMainGymMetricState(metric)
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
</script>

<main bind:this={shellElement} class={`app-shell ${pageTransitionClassName}`}>
  <header class="page-hero">
    <div class="hero-top">
      <div class="atl-brand-row" aria-label="Atlament Analytics">
        <p bind:this={characterTriggerElement} class="eyebrow atl-character-trigger">Atlament / Analytics</p>
      </div>
    </div>
    <h1>Analytics</h1>
    <p class="lead">
      データから傾向を見つける<br />
      ワークアウトデータをさまざまな視点から分析します
    </p>
  </header>

  <AnalyticsSummary
    filteredSessionCount={filteredSessions.length}
    {totalSets}
    mainGymWeight={formatMainGymMetric(totalVolume)}
    {averageInterval}
  />

  {#if loadError}
    <section class="panel">
      <p class="eyebrow">Data Load Warning</p>
      <h2>データ取得異常</h2>
      <p class="muted">データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください</p>
    </section>
  {/if}

  <AnalyticsPeriodPanel bind:selectedPeriod {periodRange} />

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
      {#if mainGymVolumeTrendReady}
        {#key mainGymVolumeTrendKey}
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

  <section class="analytics-single-grid">
    <article class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-calendar-sync-outline" aria-hidden="true"></i></div>
          <div class="card-heading__text">
            <p class="eyebrow">Training Frequency</p>
            <h2>トレーニング頻度</h2>
          </div>
        </div>
      </div>
      <p class="large-number">{trainingFrequencyPerWeek.toFixed(1)} / week</p>
    </article>
  </section>

  <section class="dashboard-grid analytics-table-grid">
    <article class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-format-list-numbered-rtl" aria-hidden="true"></i></div>
          <div class="card-heading__text">
            <p class="eyebrow">Machine Variety</p>
            <h2>部位別実施マシン数</h2>
          </div>
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
          <p class="muted">データがありません</p>
        {/each}
      </div>
    </article>

    <article class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-arm-flex-outline" aria-hidden="true"></i></div>
          <div class="card-heading__text">
            <p class="eyebrow">Body Part Volume - Main Gym</p>
            <h2>部位別ボリューム - メインジム</h2>
          </div>
        </div>
      </div>
      <div class="summary-table body-part-volume-table">
        <div class="summary-row header">
          <span>Body Part</span>
          <span>Sets</span>
          <span>Total Weight</span>
        </div>
        {#each mainGymBodyPartSummaryRows as item}
          <div class="summary-row">
            <span>{formatBodyPart(item.bodyPart)}</span>
            <span>{item.sets}</span>
            <span>{item.volume.toLocaleString()} kg</span>
          </div>
        {:else}
          <p class="muted">データがありません</p>
        {/each}
      </div>
    </article>
  </section>

  <section class="dashboard-grid analytics-table-grid">
    <article class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-chart-donut" aria-hidden="true"></i></div>
          <div class="card-heading__text">
            <p class="eyebrow">Body Part Share</p>
            <h2>部位別シェア</h2>
          </div>
        </div>
      </div>
      <div class="summary-table body-part-share-table">
        <div class="summary-row header">
          <span>Body Part</span>
          <span>Sets</span>
          <span>Share</span>
          <span>Last</span>
        </div>
        {#each bodyPartShareRows as item}
          <div class="summary-row">
            <span>{formatBodyPart(item.bodyPart)}</span>
            <span>{item.setCount}</span>
            <span>{formatPercent(item.share)}</span>
            <span>{formatDisplayDate(bodyPartLastTrainedRows.find((row) => row.bodyPart === item.bodyPart)?.lastTrainedDate ?? '-')}</span>
          </div>
        {:else}
          <p class="muted">データがありません</p>
        {/each}
      </div>
    </article>

    <article class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-podium" aria-hidden="true"></i></div>
          <div class="card-heading__text">
            <p class="eyebrow">Machine Ranking</p>
            <h2>実施マシン頻度</h2>
          </div>
        </div>
      </div>
      <div class="summary-table machine-ranking-table">
        <div class="summary-row header">
          <span>Machine</span>
          <span>Sessions</span>
        </div>
        {#each machineFrequencyRows as item}
          <div class="summary-row">
            <span>{item.machineName}</span>
            <span>{item.sessionCount}</span>
          </div>
        {:else}
          <p class="muted">データがありません</p>
        {/each}
      </div>
    </article>
  </section>

  <section class="dashboard-grid analytics-table-grid">
    <article class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-map-marker-outline" aria-hidden="true"></i></div>
          <div class="card-heading__text">
            <p class="eyebrow">Gym Sessions</p>
            <h2>ジム</h2>
          </div>
        </div>
      </div>
      <div class="summary-table gym-session-table">
        <div class="summary-row header">
          <span>Gym</span>
          <span>Sessions</span>
        </div>
        {#each gymRows as item}
          <div class="summary-row">
            <span>{item.gymName}</span>
            <span>{item.sessionCount}</span>
          </div>
        {:else}
          <p class="muted">データがありません</p>
        {/each}
      </div>
    </article>

    <article class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-arm-flex-outline" aria-hidden="true"></i></div>
          <div class="card-heading__text">
            <p class="eyebrow">Body Part Sets</p>
            <h2>部位別セット分布</h2>
          </div>
        </div>
      </div>
      <div class="summary-table body-part-sets-table">
        <div class="summary-row header">
          <span>Body Part</span>
          <span>Sets</span>
        </div>
        {#each bodyPartSetRows as item}
          <div class="summary-row">
            <span>{formatBodyPart(item.bodyPart)}</span>
            <span>{item.setCount}</span>
          </div>
        {:else}
          <p class="muted">データがありません</p>
        {/each}
      </div>
    </article>
  </section>
</main>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
  import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
  import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
  import type { WorkoutMasterData, WorkoutSession } from '@workout-lab/workout-types'
  import AnalyticsCharts from './AnalyticsCharts.svelte'
  import AnalyticsPeriodPanel from './AnalyticsPeriodPanel.svelte'
  import AnalyticsSummary from './AnalyticsSummary.svelte'
  import AnalyticsTables from './AnalyticsTables.svelte'
  import {
    filterSessionsByDateRange,
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

  /**
   * Analytics の Composition Root。
   *
   * Runtime Data の取得、期間選択、派生 analytics data の orchestration、Shell lifecycle を所有する。
   * Chart lifecycle は `AnalyticsCharts`、summary/table presentation は各子 component へ委譲し、
   * この file では state ownership と component composition を中心に読めるようにする。
   */
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

  let shellElement: HTMLElement
  let navigation: { dispose: () => void } | null = null

  onMount(async () => {
    navigation = initializeAppNavigation({
      currentRouteId: 'analytics',
      shell: shellElement,
      screen: {
        eyebrow: 'Atlament / Analytics',
        title: 'Analytics',
        description: ['データから傾向を見つける', 'ワークアウトデータをさまざまな視点から分析します'],
        ariaLabel: 'Atlament Analytics',
      },
    })
    try {
      const result = await loadRuntimeWorkoutSessions()
      sessions = result.sessions
      masterData = result.masterData
      loadError = result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Workout data could not be loaded.'
    }

  })

  onDestroy(() => {
    navigation?.dispose()
  })

  const bodyPartDisplayOrder = ['shoulders', 'arms', 'chest', 'core', 'back', 'glutes', 'legs'] as const

  /**
   * UI上の部位表示順を固定する presentation helper。
   *
   * Core集計の意味論は変更せず、Analytics画面での読解順だけをここで整える。
   */
  function orderByBodyPartDisplayOrder<T extends { bodyPart: string }>(rows: T[]): T[] {
    const order = new Map<string, number>(bodyPartDisplayOrder.map((bodyPart, index) => [bodyPart, index]))

    return [...rows].sort(
      (a, b) =>
        (order.get(a.bodyPart) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.bodyPart) ?? Number.MAX_SAFE_INTEGER),
    )
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
  <div data-application-shell-content>
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

    <AnalyticsCharts
      trendPoints={mainGymVolumeTrendPoints}
      {bodyPartSummaryRows}
    />

    <AnalyticsTables
      {trainingFrequencyPerWeek}
      {machineVarietyRows}
      {mainGymBodyPartSummaryRows}
      {bodyPartShareRows}
      {bodyPartLastTrainedRows}
      {machineFrequencyRows}
      {gymRows}
      {bodyPartSetRows}
    />
  </div>
</main>

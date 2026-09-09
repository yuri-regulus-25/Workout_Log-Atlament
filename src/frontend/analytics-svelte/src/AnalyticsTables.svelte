<script lang="ts">
  import { formatBodyPart, formatDisplayDate } from '@workout-lab/workout-core'

  type MachineVarietyRow = { bodyPart: string; machineCount: number }
  type BodyPartSummaryRow = { bodyPart: string; sets: number; volume: number }
  type BodyPartShareRow = { bodyPart: string; setCount: number; share: number }
  type BodyPartLastTrainedRow = { bodyPart: string; lastTrainedDate: string }
  type MachineFrequencyRow = { machineName: string; sessionCount: number }
  type GymRow = { gymName: string; sessionCount: number }
  type BodyPartSetRow = { bodyPart: string; setCount: number }

  export let trainingFrequencyPerWeek = 0
  export let machineVarietyRows: MachineVarietyRow[] = []
  export let mainGymBodyPartSummaryRows: BodyPartSummaryRow[] = []
  export let bodyPartShareRows: BodyPartShareRow[] = []
  export let bodyPartLastTrainedRows: BodyPartLastTrainedRow[] = []
  export let machineFrequencyRows: MachineFrequencyRow[] = []
  export let gymRows: GymRow[] = []
  export let bodyPartSetRows: BodyPartSetRow[] = []

  function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`
  }
</script>

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
    {@render AnalyticsPanelHeading('mdi-format-list-numbered-rtl', 'Machine Variety', '部位別実施マシン数')}
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
    {@render AnalyticsPanelHeading('mdi-arm-flex-outline', 'Body Part Volume - Main Gym', '部位別ボリューム - メインジム')}
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
    {@render AnalyticsPanelHeading('mdi-chart-donut', 'Body Part Share', '部位別シェア')}
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
    {@render AnalyticsPanelHeading('mdi-podium', 'Machine Ranking', '実施マシン頻度')}
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
    {@render AnalyticsPanelHeading('mdi-map-marker-outline', 'Gym Sessions', 'ジム')}
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
    {@render AnalyticsPanelHeading('mdi-arm-flex-outline', 'Body Part Sets', '部位別セット分布')}
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

{#snippet AnalyticsPanelHeading(icon: string, eyebrow: string, title: string)}
  <div class="panel-header">
    <div class="card-heading">
      <div class="card-heading__icon"><i class={`mdi ${icon}`} aria-hidden="true"></i></div>
      <div class="card-heading__text">
        <p class="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  </div>
{/snippet}

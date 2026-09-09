<script lang="ts">
  import { formatDisplayDate, type PeriodPreset, type DateRange } from '@workout-lab/workout-core'

  export let selectedPeriod: PeriodPreset
  export let periodRange: DateRange

  const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
    { value: '7d', label: '7 Days' },
    { value: '28d', label: '28 Days' },
    { value: 'month', label: 'Current Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: 'all', label: 'Entire Period' },
  ]
</script>

<section class="panel analytics-period-panel">
  <div class="panel-header">
    <div class="card-heading">
      <div class="card-heading__icon"><i class="mdi mdi-calendar-range-outline" aria-hidden="true"></i></div>
      <div class="card-heading__text">
        <p class="eyebrow">Global Period</p>
        <h2>{formatDisplayDate(periodRange.startDate)} - {formatDisplayDate(periodRange.endDate)}</h2>
      </div>
    </div>
    <label class="field period-field">
      <span>Period</span>
      <select bind:value={selectedPeriod}>
        {#each periodOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>
  </div>
</section>

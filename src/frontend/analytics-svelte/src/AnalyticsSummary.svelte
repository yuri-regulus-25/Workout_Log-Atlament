<script lang="ts">
  export let filteredSessionCount = 0
  export let totalSets = 0
  export let mainGymWeight = 'No Data'
  export let averageInterval = '—'
</script>

<section class="metric-grid" aria-label="Analytics summary">
  <article class="metric-card">
    <span>Period workouts</span>
    <strong>{filteredSessionCount} {filteredSessionCount > 1 ? 'Sessions' : 'Session'}</strong>
  </article>
  <article class="metric-card">
    <span>Total sets</span>
    <strong>{totalSets} {totalSets > 1 ? 'Sets' : 'Set'}</strong>
  </article>
  <article class="metric-card">
    <span>Main Gym weight</span>
    <strong>{mainGymWeight}</strong>
  </article>
  <article class="metric-card">
    <span>Average interval</span>
    <strong>{averageInterval}</strong>
  </article>
</section>

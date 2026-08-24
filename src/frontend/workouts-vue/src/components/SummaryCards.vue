<script setup lang="ts">
import { computed } from 'vue'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { formatDisplayDate, getSessionSetCount, getSessionVolume } from '@workout-lab/workout-core'

const props = defineProps<{
  sessions: WorkoutSession[]
}>()

const totalSets = computed(() =>
  props.sessions.reduce((total, session) => total + getSessionSetCount(session), 0),
)

const totalVolume = computed(() =>
  props.sessions.reduce((total, session) => total + getSessionVolume(session), 0),
)

const latestWorkout = computed(() => {
  const date = props.sessions.at(-1)?.date
  return date ? formatDisplayDate(date) : '—'
})
</script>

<template>
  <section class="summary-grid">
    <article class="metric-card">
      <span>Workouts</span>
      <strong>{{ sessions.length }}</strong>
    </article>
    <article class="metric-card">
      <span>Total sets</span>
      <strong>{{ totalSets }}</strong>
    </article>
    <article class="metric-card">
      <span>Total volume</span>
      <strong>{{ totalVolume.toLocaleString() }} kg</strong>
    </article>
    <article class="metric-card">
      <span>Latest</span>
      <strong>{{ latestWorkout }}</strong>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { applicationRoutes } from '@workout-lab/frontend-common/navigation'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import {
  formatBodyPart,
  formatDisplayDate,
  formatTotalWeight,
  getMachineVolume,
  getSessionSetCount,
  getSessionVolume,
} from '@workout-lab/workout-core'

const props = defineProps<{
  date: string
}>()

const workoutSessions = ref<WorkoutSession[]>([])
const loadError = ref<string | null>(null)
const sessions = computed(() => workoutSessions.value.filter((workout) => workout.date === props.date))

onMounted(async () => {
  try {
    const result = await loadRuntimeWorkoutSessions()
    workoutSessions.value = result.sessions
    loadError.value = result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Workout data could not be loaded.'
  }
})
const totalMachines = computed(() =>
  sessions.value.reduce((total, session) => total + session.machines.length, 0),
)
const totalSets = computed(() =>
  sessions.value.reduce((total, session) => total + getSessionSetCount(session), 0),
)
const totalVolume = computed(() =>
  sessions.value.reduce((total, session) => total + getSessionVolume(session), 0),
)
</script>

<template>
  <section v-if="loadError" class="panel" style="margin-bottom: 16px">
    <p class="eyebrow">Data Load Warning</p>
    <h2>データが正常ではありません。</h2>
    <p class="muted">{{ loadError }}</p>
  </section>

  <section v-if="sessions.length > 0" class="view-stack">
    <p>{{ formatDisplayDate(props.date) }} · {{ sessions.length }} session</p>

    <section class="summary-grid">
      <article class="metric-card">
        <span>Machines</span>
        <strong>{{ totalMachines }} {{ totalMachines === 1 ? "Machine": "Machines" }}</strong>
      </article>
      <article class="metric-card">
        <span>Sets</span>
        <strong>{{ totalSets }} {{ totalSets === 1 ? "Set": "Sets" }}</strong>
      </article>
      <article class="metric-card">
        <span>Volume</span>
        <strong>{{ totalVolume.toLocaleString() }} kg</strong>
      </article>
      <article class="metric-card">
        <span>Sessions</span>
        <strong>{{ sessions.length }} {{ sessions.length === 1 ? "Session": "Sessions" }}</strong>
      </article>
    </section>

    <section v-for="session in sessions" :key="session.session_id" class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-text-box-outline" aria-hidden="true" /></div>
          <div class="card-heading__text">
            <p class="eyebrow">Workout Detail</p>
            <h2>ワークアウト詳細 - {{ session.gym.name }}</h2>
          </div>
        </div>
      </div>

      <div class="machine-list">
        <article v-for="machine in session.machines" :key="machine.machine_id" class="machine-card">
          <div class="machine-header">
            <div>
              <h3>{{ machine.name }}</h3>
              <p>{{ formatBodyPart(machine.body_part) }} · {{ formatTotalWeight(getMachineVolume(machine)) }}</p>
            </div>
            <a class="text-action" :href="`${applicationRoutes.machines}${machine.machine_id}/`">View Performance Detail</a>
          </div>
          <ul>
            <li v-for="set in machine.sets" :key="set.set">
              Set {{ set.set }} · {{ set.weight_kg }} kg × {{ set.reps }} reps
              <span v-if="set.rir !== undefined && set.rir !== null"> · RIR {{ set.rir }}</span>
            </li>
          </ul>
        </article>
      </div>

      <div v-if="(session.notes?.length ?? 0) > 0" class="session-notes">
        <p class="eyebrow">Notes</p>
        <p v-for="note in session.notes ?? []" :key="note" class="note-line">{{ note }}</p>
      </div>
    </section>
  </section>

  <section v-else class="view-stack">
    <p>記録されていない日を見ようとしたみたい。戻ろう。</p>
    <a class="text-action" :href="applicationRoutes.workouts"><i class="mdi mdi-chevron-double-left" />Back to Workout Domain</a>
  </section>
</template>


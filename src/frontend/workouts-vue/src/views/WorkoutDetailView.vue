<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { applicationRoutes } from '@workout-lab/frontend-common/navigation'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import {
  compareWorkoutSessions,
  formatBodyPart,
  formatDisplayDate,
  formatTotalWeight,
  resolveWorkoutNeighborsByDate,
} from '@workout-lab/workout-core'
import { getMachinePresentation, getMachineReps, getWorkoutDaySummary } from '../workout-detail-presentation'

const props = defineProps<{
  date: string
}>()

const workoutSessions = ref<WorkoutSession[]>([])
const loadError = ref<string | null>(null)
const sessions = computed(() => workoutSessions.value.filter((workout) => workout.date === props.date))
const collapsedMachines = ref(new Set<string>())
const workoutNavigation = computed(() => resolveWorkoutNeighborsByDate(workoutSessions.value, props.date))
const sessionComparison = computed(() => {
  const navigation = workoutNavigation.value
  return navigation?.previous ? compareWorkoutSessions(navigation.current, navigation.previous) : null
})

onMounted(async () => {
  try {
    const result = await loadRuntimeWorkoutSessions()
    workoutSessions.value = result.sessions
    loadError.value = result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Workout data could not be loaded.'
  }
})
const daySummary = computed(() => getWorkoutDaySummary(sessions.value))

function machineKey(session: WorkoutSession, machineId: string): string {
  return `${session.session_id}:${machineId}`
}

function isMachineCollapsed(session: WorkoutSession, machineId: string): boolean {
  return collapsedMachines.value.has(machineKey(session, machineId))
}

function toggleMachine(session: WorkoutSession, machineId: string) {
  const next = new Set(collapsedMachines.value)
  const key = machineKey(session, machineId)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  collapsedMachines.value = next
}

function formatSigned(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}`
}

function machineNames(machines: Array<{ machineName: string }>): string {
  return machines.length > 0 ? machines.map((machine) => machine.machineName).join(', ') : '-'
}

</script>

<template>
  <section v-if="loadError" class="panel" style="margin-bottom: 16px">
    <p class="eyebrow">Data Load Warning</p>
    <h2>データが正常ではありません。</h2>
    <p class="muted">{{ loadError }}</p>
  </section>

  <section v-if="sessions.length > 0" class="view-stack">
    <div class="detail-summary-heading">
      <p class="eyebrow">{{ formatDisplayDate(props.date) }}</p>
      <h2>{{ daySummary.gymNames }}</h2>
      <p class="muted">{{ sessions.length }} {{ sessions.length === 1 ? "session" : "sessions" }}</p>
    </div>

    <nav v-if="workoutNavigation" class="detail-navigation" aria-label="Workout navigation">
      <RouterLink
        v-if="workoutNavigation.previous"
        class="text-action"
        :to="{ name: 'workout-detail', params: { date: workoutNavigation.previous.date } }"
      >
        <i class="mdi mdi-chevron-left" aria-hidden="true" />Previous
      </RouterLink>
      <span v-else class="muted">Previous</span>
      <RouterLink
        v-if="workoutNavigation.next"
        class="text-action"
        :to="{ name: 'workout-detail', params: { date: workoutNavigation.next.date } }"
      >
        Next<i class="mdi mdi-chevron-right" aria-hidden="true" />
      </RouterLink>
      <span v-else class="muted">Next</span>
    </nav>

    <section class="summary-grid">
      <article class="metric-card">
        <span>Machines</span>
        <strong>{{ daySummary.totalMachines }} {{ daySummary.totalMachines === 1 ? "Machine": "Machines" }}</strong>
      </article>
      <article class="metric-card">
        <span>Sets</span>
        <strong>{{ daySummary.totalSets }} {{ daySummary.totalSets === 1 ? "Set": "Sets" }}</strong>
      </article>
      <article class="metric-card">
        <span>Total Reps</span>
        <strong>{{ daySummary.totalReps.toLocaleString() }} reps</strong>
      </article>
      <article class="metric-card">
        <span>Volume</span>
        <strong>{{ daySummary.totalVolume.toLocaleString() }} kg</strong>
      </article>
      <article class="metric-card">
        <span>Sessions</span>
        <strong>{{ sessions.length }} {{ sessions.length === 1 ? "Session": "Sessions" }}</strong>
      </article>
    </section>

    <section v-if="sessionComparison" class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-compare-horizontal" aria-hidden="true" /></div>
          <div class="card-heading__text">
            <p class="eyebrow">Session Compare</p>
            <h2>前回セッション比較</h2>
          </div>
        </div>
      </div>
      <div class="compare-grid">
        <article class="metric-card">
          <span>Machines</span>
          <strong>{{ formatSigned(sessionComparison.machineCountDelta.absolute) }}</strong>
        </article>
        <article class="metric-card">
          <span>Sets</span>
          <strong>{{ formatSigned(sessionComparison.setCountDelta.absolute) }}</strong>
        </article>
        <article class="metric-card">
          <span>Total Reps</span>
          <strong>{{ formatSigned(sessionComparison.totalRepsDelta.absolute) }}</strong>
        </article>
      </div>
      <div class="compare-lists">
        <div>
          <p class="eyebrow">Added Machines</p>
          <p class="muted">{{ machineNames(sessionComparison.addedMachines) }}</p>
        </div>
        <div>
          <p class="eyebrow">Removed Machines</p>
          <p class="muted">{{ machineNames(sessionComparison.removedMachines) }}</p>
        </div>
      </div>
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
              <p>
                {{ formatBodyPart(machine.body_part) }} ·
                {{ machine.sets.length }} {{ machine.sets.length === 1 ? "set" : "sets" }} ·
                {{ getMachineReps(machine).toLocaleString() }} reps ·
                {{ formatTotalWeight(getMachinePresentation(machine).volume) }}
              </p>
            </div>
            <div class="machine-actions">
              <a class="text-action" :href="`${applicationRoutes.machines}${machine.machine_id}/`">
                <i class="mdi mdi-chart-line" aria-hidden="true" />Performance
              </a>
              <button
                type="button"
                class="text-action"
                :aria-expanded="!isMachineCollapsed(session, machine.machine_id)"
                @click="toggleMachine(session, machine.machine_id)"
              >
                {{ isMachineCollapsed(session, machine.machine_id) ? "Expand" : "Collapse" }}
              </button>
            </div>
          </div>
          <div v-if="!isMachineCollapsed(session, machine.machine_id)" class="set-table-wrap">
            <table class="set-table">
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Weight</th>
                  <th>Reps</th>
                  <th v-if="getMachinePresentation(machine).hasRir" class="supporting-cell">RIR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="set in machine.sets" :key="set.set">
                  <td>{{ set.set }}</td>
                  <td>{{ set.weight_kg }} kg</td>
                  <td>{{ set.reps }}</td>
                  <td v-if="getMachinePresentation(machine).hasRir" class="supporting-cell">
                    <span v-if="set.rir !== undefined && set.rir !== null">{{ set.rir }}</span>
                    <span v-else>—</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="(machine.notes?.length ?? 0) > 0" class="machine-notes">
              <p v-for="note in machine.notes ?? []" :key="note" class="note-line">{{ note }}</p>
            </div>
          </div>
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


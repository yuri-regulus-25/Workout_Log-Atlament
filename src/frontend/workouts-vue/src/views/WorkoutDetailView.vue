<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { applicationRoutes } from '@workout-lab/frontend-common/navigation'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import {
  compareWorkoutSessions,
  formatDisplayDate,
  formatTotalWeight,
  getGymDisplayName,
  getMachineBodyPartDisplay,
  getMachineDisplayName,
  resolveWorkoutNeighborsByDate,
} from '@workout-lab/workout-core'
import { formatCountLabel, getMachinePresentation, getMachineReps, getWorkoutDaySummary } from '../workout-detail-presentation'

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

function formatSignedCount(value: number, singular: string, plural: string): string {
  return `${value > 0 ? '+' : ''}${formatCountLabel(value, singular, plural)}`
}

function machineNames(machines: Array<{ machineName: string }>): string {
  return machines.length > 0 ? machines.map((machine) => machine.machineName).join(', ') : '-'
}

</script>

<template>
  <section v-if="loadError" class="panel" style="margin-bottom: 16px">
    <p class="eyebrow">Data Load Warning</p>
    <h2>データ取得異常</h2>
    <p class="muted">データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください</p>
  </section>

  <section v-if="sessions.length > 0" class="view-stack">
    <div class="detail-summary-heading">
      <p class="eyebrow">{{ formatDisplayDate(props.date) }}</p>
      <h2>{{ daySummary.gymNames }}</h2>
      <p class="muted">{{ sessions.length }} {{ sessions.length === 1 ? "session" : "sessions" }}</p>
    </div>

    <nav v-if="workoutNavigation" class="detail-navigation" aria-label="Workout navigation">
      <a
        v-if="workoutNavigation.previous"
        class="text-action"
        :href="`${applicationRoutes.workouts}${workoutNavigation.previous.date}/`"
      >
        <i class="mdi mdi-chevron-left" aria-hidden="true" />Previous
      </a>
      <span v-else class="muted">Previous</span>
      <a
        v-if="workoutNavigation.next"
        class="text-action"
        :href="`${applicationRoutes.workouts}${workoutNavigation.next.date}/`"
      >
        Next<i class="mdi mdi-chevron-right" aria-hidden="true" />
      </a>
      <span v-else class="muted">Next</span>
    </nav>

    <section class="summary-grid">
      <article class="metric-card">
        <span>Machines</span>
        <strong>{{ formatCountLabel(daySummary.totalMachines, "Machine", "Machines") }}</strong>
      </article>
      <article class="metric-card">
        <span>Sets</span>
        <strong>{{ formatCountLabel(daySummary.totalSets, "Set", "Sets") }}</strong>
      </article>
      <article class="metric-card">
        <span>Total Reps</span>
        <strong>{{ formatCountLabel(daySummary.totalReps, "Rep", "Reps") }}</strong>
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
          <strong>{{ formatSignedCount(sessionComparison.machineCountDelta.absolute, "Machine", "Machines") }}</strong>
        </article>
        <article class="metric-card">
          <span>Sets</span>
          <strong>{{ formatSignedCount(sessionComparison.setCountDelta.absolute, "Set", "Sets") }}</strong>
        </article>
        <article class="metric-card">
          <span>Total Reps</span>
          <strong>{{ formatSignedCount(sessionComparison.totalRepsDelta.absolute, "Rep", "Reps") }}</strong>
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
            <h2>ワークアウト詳細 - {{ getGymDisplayName(session.gym) }}</h2>
          </div>
        </div>
      </div>

      <div class="machine-list">
        <article v-for="machine in session.machines" :key="machine.machine_id" class="machine-card">
          <div class="machine-header">
            <div>
              <h3>{{ getMachineDisplayName(machine) }}</h3>
              <p>
                {{ getMachineBodyPartDisplay(machine) }} ·
                {{ formatCountLabel(machine.sets.length, "set", "sets") }} ·
                {{ formatCountLabel(getMachineReps(machine), "rep", "reps") }} ·
                {{ formatTotalWeight(getMachinePresentation(machine).volume) }}
              </p>
            </div>
            <div class="machine-actions">
              <button
                type="button"
                class="text-action"
                :aria-expanded="!isMachineCollapsed(session, machine.machine_id)"
                @click="toggleMachine(session, machine.machine_id)"
              >
              <i :class="isMachineCollapsed(session, machine.machine_id) ? 'mdi mdi-unfold-more-horizontal' : 'mdi mdi-unfold-less-horizontal'" />
              </button>
              <a class="text-action" :href="`${applicationRoutes.machines}${machine.machine_id}/`">
                <i class="mdi mdi-chart-line" aria-hidden="true" />Performance
              </a>
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
              <p class="eyebrow">Notes</p>
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
    <p>指定された日付のデータがありませんでした。サボりですか？サボりました？</p>
    <a class="text-action" :href="applicationRoutes.workouts"><i class="mdi mdi-chevron-double-left" />Back to Workout Domain</a>
  </section>
</template>


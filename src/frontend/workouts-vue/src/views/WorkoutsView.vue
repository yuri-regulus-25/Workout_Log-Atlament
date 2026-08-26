<template>
    <section class="panel" style="margin-bottom: 16px">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Search Target Machine</p>
          <h2>検索対象マシン</h2>
        </div>
        <WorkoutFilters v-model:selected-machine="selectedMachine" :machine-options="machineOptions" />
      </div>
    </section>

    <section v-if="loadError" class="panel" style="margin-bottom: 16px">
      <p class="eyebrow">Data Load Warning</p>
      <h2>データが正常ではありません。</h2>
      <p class="muted">{{ loadError }}</p>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Workout Record</p>
          <h2>ワークアウト記録</h2>
        </div>
      </div>
      <WorkoutGrid
        :sessions="filteredSessions"
        @open-session="openSession"
      />
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import WorkoutFilters from '../components/WorkoutFilters.vue'
import WorkoutGrid from '../components/WorkoutGrid.vue'

const router = useRouter()
const workoutSessions = ref<WorkoutSession[]>([])
const loadError = ref<string | null>(null)

const selectedMachine = ref('all')

onMounted(async () => {
  try {
    const result = await loadRuntimeWorkoutSessions()
    workoutSessions.value = result.sessions
    loadError.value = result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Workout data could not be loaded.'
  }
})

const machineOptions = computed(() => {
  const names = new Set<string>()

  for (const session of workoutSessions.value) {
    for (const exercise of session.exercises) {
      names.add(exercise.name)
    }
  }

  return ['all', ...Array.from(names).sort()]
})

const filteredSessions = computed(() => {
  if (selectedMachine.value === 'all') {
    return workoutSessions.value
  }

  return workoutSessions.value.filter((session) =>
    session.exercises.some((exercise) => exercise.name === selectedMachine.value),
  )
})

function openSession(session: WorkoutSession) {
  router.push({ name: 'workout-detail', params: { date: session.date } })
}
</script>

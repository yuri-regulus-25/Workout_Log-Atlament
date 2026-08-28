<template>
    <section class="panel" style="margin-bottom: 16px">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-magnify" aria-hidden="true" /></div>
          <div class="card-heading__text">
            <p class="eyebrow">Search Target Machine</p>
            <h2>検索対象マシン</h2>
          </div>
        </div>
        <WorkoutFilters
          v-model:search-text="searchText"
          v-model:selected-machine="selectedMachine"
          v-model:selected-body-part="selectedBodyPart"
          v-model:selected-gym="selectedGym"
          v-model:date-from="dateFrom"
          v-model:date-to="dateTo"
          v-model:sort-direction="sortDirection"
          :machine-options="machineOptions"
          :body-part-options="bodyPartOptions"
          :gym-options="gymOptions"
          :result-count="filteredSessions.length"
          :total-count="workoutSessions.length"
          @reset="resetFilters"
        />
      </div>
    </section>

    <section v-if="loadError" class="panel" style="margin-bottom: 16px">
      <p class="eyebrow">Data Load Warning</p>
      <h2>データが正常ではありません。</h2>
      <p class="muted">{{ loadError }}</p>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-table" aria-hidden="true" /></div>
          <div class="card-heading__text">
            <p class="eyebrow">Workout Record</p>
            <h2>ワークアウト記録</h2>
          </div>
        </div>
      </div>
      <WorkoutGrid
        :sessions="filteredSessions"
        :date-sort-direction="sortDirection"
        @open-session="openSession"
      />
      <div v-if="filteredSessions.length === 0" class="empty-result" role="status" aria-live="polite">
        <p class="eyebrow">No Results</p>
        <h3>条件に一致するワークアウトがありません。</h3>
        <p class="muted">検索条件、Machine、Body Part、Gym、日付範囲を変更してください。</p>
      </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import WorkoutFilters from '../components/WorkoutFilters.vue'
import WorkoutGrid from '../components/WorkoutGrid.vue'
import { defaultWorkoutListFilters, filterWorkoutSessions } from '../workout-list-filters'

const router = useRouter()
const workoutSessions = ref<WorkoutSession[]>([])
const loadError = ref<string | null>(null)

const searchText = ref(defaultWorkoutListFilters.searchText)
const selectedMachine = ref(defaultWorkoutListFilters.selectedMachine)
const selectedBodyPart = ref(defaultWorkoutListFilters.selectedBodyPart)
const selectedGym = ref(defaultWorkoutListFilters.selectedGym)
const dateFrom = ref(defaultWorkoutListFilters.dateFrom)
const dateTo = ref(defaultWorkoutListFilters.dateTo)
const sortDirection = ref(defaultWorkoutListFilters.sortDirection)

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
    for (const machine of session.machines) {
      names.add(machine.name)
    }
  }

  return ['all', ...Array.from(names).sort()]
})

const bodyPartOptions = computed(() => {
  const bodyParts = new Set<string>()

  for (const session of workoutSessions.value) {
    for (const machine of session.machines) {
      bodyParts.add(machine.body_part)
    }
  }

  return Array.from(bodyParts).sort()
})

const gymOptions = computed(() => {
  const gyms = new Set<string>()

  for (const session of workoutSessions.value) {
    gyms.add(session.gym.name)
  }

  return Array.from(gyms).sort()
})

const filteredSessions = computed(() => {
  return filterWorkoutSessions(workoutSessions.value, {
    searchText: searchText.value,
    selectedMachine: selectedMachine.value,
    selectedBodyPart: selectedBodyPart.value,
    selectedGym: selectedGym.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    sortDirection: sortDirection.value,
  })
})

function openSession(session: WorkoutSession) {
  router.push({ name: 'workout-detail', params: { date: session.date } })
}

function resetFilters() {
  searchText.value = defaultWorkoutListFilters.searchText
  selectedMachine.value = defaultWorkoutListFilters.selectedMachine
  selectedBodyPart.value = defaultWorkoutListFilters.selectedBodyPart
  selectedGym.value = defaultWorkoutListFilters.selectedGym
  dateFrom.value = defaultWorkoutListFilters.dateFrom
  dateTo.value = defaultWorkoutListFilters.dateTo
  sortDirection.value = defaultWorkoutListFilters.sortDirection
}
</script>

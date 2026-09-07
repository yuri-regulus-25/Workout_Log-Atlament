<template>
    <section class="panel" style="margin-bottom: 16px">
      <div class="panel-header">
        <div class="card-heading">
          <div class="card-heading__icon"><i class="mdi mdi-magnify" aria-hidden="true" /></div>
          <div class="card-heading__text">
            <p class="eyebrow">Search Target</p>
            <h2>検索対象</h2>
          </div>
        </div>
      </div>
      <div class="panel-content">
        <WorkoutFilters
          v-model:search-text="searchText"
          v-model:selected-machine="selectedMachine"
          v-model:selected-body-part="selectedBodyPart"
          v-model:selected-gym="selectedGym"
          v-model:date-from="dateFrom"
          v-model:date-to="dateTo"
          :machine-options="machineOptions"
          :body-part-options="bodyPartOptions"
          :gym-options="gymOptions"
          @reset="resetFilters"
        />
      </div>
    </section>

    <section v-if="loadError" class="panel" style="margin-bottom: 16px">
      <p class="eyebrow">Data Load Warning</p>
      <h2>データ取得異常</h2>
      <p class="muted">データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください</p>
    </section>

    <WorkoutCalendar :sessions="workoutSessions" @open-date="openDate" />

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
        @open-session="openSession"
      />
      <div v-if="filteredSessions.length === 0" class="empty-result" role="status" aria-live="polite">
        <p class="eyebrow">No Results</p>
        <h3>条件に一致するワークアウトがありません。</h3>
        <p class="muted">検索条件を確認してください</p>
      </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data'
import {
  getGymDisplayName,
  getMachineDisplayName,
} from '@workout-lab/workout-core'
import WorkoutCalendar from '../components/WorkoutCalendar.vue'
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
      names.add(getMachineDisplayName(machine))
    }
  }

  return ['all', ...Array.from(names).sort()]
})

const bodyPartOptions = computed(() => {
  const bodyParts = new Set<string>()

  for (const session of workoutSessions.value) {
    for (const machine of session.machines) {
      if (machine.body_part) {
        bodyParts.add(machine.body_part)
      }
    }
  }

  return Array.from(bodyParts).sort()
})

const gymOptions = computed(() => {
  const gyms = new Set<string>()

  for (const session of workoutSessions.value) {
    gyms.add(getGymDisplayName(session.gym))
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
  })
})

function openSession(session: WorkoutSession) {
  router.push({ name: 'workout-detail', params: { date: session.date } })
}

function openDate(date: string) {
  router.push({ name: 'workout-detail', params: { date } })
}

function resetFilters() {
  searchText.value = defaultWorkoutListFilters.searchText
  selectedMachine.value = defaultWorkoutListFilters.selectedMachine
  selectedBodyPart.value = defaultWorkoutListFilters.selectedBodyPart
  selectedGym.value = defaultWorkoutListFilters.selectedGym
  dateFrom.value = defaultWorkoutListFilters.dateFrom
  dateTo.value = defaultWorkoutListFilters.dateTo
}
</script>

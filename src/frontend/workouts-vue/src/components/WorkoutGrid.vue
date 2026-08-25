<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WorkoutRow, WorkoutSession } from '@workout-lab/workout-types'
import { formatDisplayDate, toWorkoutRows } from '@workout-lab/workout-core'

const props = defineProps<{
  sessions: WorkoutSession[]
}>()

const emit = defineEmits<{
  openSession: [session: WorkoutSession]
}>()

type SortKey = 'date' | 'gym' | 'exerciseCount' | 'totalSets' | 'totalVolume'
type SortDirection = 'asc' | 'desc'

const pageSize = ref(10)
const currentPage = ref(1)
const sortKey = ref<SortKey>('date')
const sortDirection = ref<SortDirection>('desc')

const rowData = computed(() => {
  const rows = toWorkoutRows(props.sessions)

  return [...rows].sort((a, b) => {
    const aValue = a[sortKey.value]
    const bValue = b[sortKey.value]
    const direction = sortDirection.value === 'asc' ? 1 : -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction
    }

    return String(aValue).localeCompare(String(bValue)) * direction
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(rowData.value.length / pageSize.value)))
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return rowData.value.slice(start, start + pageSize.value)
})

watch(rowData, () => {
  if (currentPage.value > pageCount.value) {
    currentPage.value = pageCount.value
  }
})

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = key === 'date' ? 'desc' : 'asc'
  }

  currentPage.value = 1
}

function selectRow(row: WorkoutRow) {
  const session = props.sessions.find((item) => item.session_id === row.sessionId)

  if (session) {
    emit('openSession', session)
  }
}
function fullGymName(row: WorkoutRow): string {
  return props.sessions.find((item) => item.session_id === row.sessionId)?.gym.name ?? row.gym
}

function displayGymName(row: WorkoutRow): string {
  const gym = props.sessions.find((item) => item.session_id === row.sessionId)?.gym

  return gym?.short_name ?? gym?.name ?? row.gym
}
function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value)
}

function sortMark(key: SortKey): string {
  if (sortKey.value !== key) {
    return ''
  }

  return sortDirection.value === 'asc' ? '↑' : '↓'
}

</script>

<template>
  <div class="workout-table-wrap">
    <table class="workout-table">
      <thead>
        <tr>
          <th><button type="button" @click="setSort('date')">Date {{ sortMark('date') }}</button></th>
          <th><button type="button" @click="setSort('gym')">Gym {{ sortMark('gym') }}</button></th>
          <th><button type="button" @click="setSort('exerciseCount')">Machines {{ sortMark('exerciseCount') }}</button></th>
          <th><button type="button" @click="setSort('totalSets')">Sets {{ sortMark('totalSets') }}</button></th>
          <th><button type="button" @click="setSort('totalVolume')">Volume {{ sortMark('totalVolume') }}</button></th>
          <th>Machine names</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in pagedRows"
          :key="row.sessionId"
          @click="selectRow(row)"
        >
          <td>{{ formatDisplayDate(row.date) }}</td>
          <td class="gym-cell" :title="fullGymName(row)">{{ displayGymName(row) }}</td>
          <td>{{ row.exerciseCount }}</td>
          <td>{{ row.totalSets }}</td>
          <td>{{ row.totalVolume.toLocaleString() }} kg</td>
          <td>{{ row.exercises }}</td>
        </tr>
      </tbody>
    </table>

    <div class="pagination-bar">
      <span>Total: {{ rowData.length }} sessions</span>
      <div>
        <label>
          Show Items
          <select v-model.number="pageSize" @change="goToPage(1)">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="rowData.length">All</option>
          </select>
        </label>
        <button type="button" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">Prev</button>
        <span>Page {{ currentPage }} / {{ pageCount }}</span>
        <button type="button" :disabled="currentPage === pageCount" @click="goToPage(currentPage + 1)">Next</button>
      </div>
    </div>
  </div>
</template>


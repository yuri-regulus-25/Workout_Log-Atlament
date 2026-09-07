<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WorkoutSession } from '@workout-lab/workout-types'
import { getCalendarMonthAggregates, getCurrentLocalYearMonth } from '@workout-lab/workout-core'

const props = defineProps<{
  sessions: WorkoutSession[]
}>()

const emit = defineEmits<{
  'open-date': [date: string]
}>()

const currentLocalMonth = getCurrentLocalYearMonth()
const visibleMonth = ref({ ...currentLocalMonth })

const calendarTitle = computed(() =>
  `${visibleMonth.value.year}-${String(visibleMonth.value.month).padStart(2, '0')}`,
)

const calendarDays = computed(() =>
  getCalendarMonthAggregates(props.sessions, visibleMonth.value.year, visibleMonth.value.month),
)

const canGoNext = computed(() =>
  visibleMonth.value.year < currentLocalMonth.year ||
  (visibleMonth.value.year === currentLocalMonth.year && visibleMonth.value.month < currentLocalMonth.month),
)

function previousMonth() {
  visibleMonth.value = visibleMonth.value.month === 1
    ? { year: visibleMonth.value.year - 1, month: 12 }
    : { year: visibleMonth.value.year, month: visibleMonth.value.month - 1 }
}

function nextMonth() {
  if (!canGoNext.value) return
  visibleMonth.value = visibleMonth.value.month === 12
    ? { year: visibleMonth.value.year + 1, month: 1 }
    : { year: visibleMonth.value.year, month: visibleMonth.value.month + 1 }
}

function openDay(date: string, sessionCount: number) {
  if (sessionCount > 0) emit('open-date', date)
}
</script>

<template>
  <section class="panel workout-calendar-panel">
    <div class="panel-header workout-calendar-header">
      <div class="card-heading">
        <div class="card-heading__icon"><i class="mdi mdi-calendar-month-outline" aria-hidden="true" /></div>
        <div class="card-heading__text">
          <p class="eyebrow">Workout Calendar</p>
          <h2>{{ calendarTitle }}</h2>
        </div>
      </div>
      <div class="calendar-actions" aria-label="Calendar month navigation">
        <button type="button" aria-label="Previous month" @click="previousMonth">
          <i class="mdi mdi-chevron-left" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next month" :disabled="!canGoNext" @click="nextMonth">
          <i class="mdi mdi-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div class="workout-calendar" aria-label="Workout calendar">
      <button
        v-for="day in calendarDays"
        :key="day.date"
        type="button"
        :class="['calendar-day', { 'calendar-day--trained': day.trainingDay }]"
        :disabled="day.sessionCount === 0"
        @click="openDay(day.date, day.sessionCount)"
      >
        <span>{{ Number(day.date.slice(8, 10)) }}</span>
        <strong v-if="day.sessionCount > 0">{{ day.sessionCount }}</strong>
      </button>
    </div>
  </section>
</template>

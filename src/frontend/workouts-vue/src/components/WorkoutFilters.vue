<script setup lang="ts">
import { formatBodyPart } from '@workout-lab/workout-core'

defineProps<{
  machineOptions: string[]
  bodyPartOptions: string[]
  gymOptions: string[]
}>()

defineEmits<{
  reset: []
}>()

const searchText = defineModel<string>('searchText', { required: true })
const selectedMachine = defineModel<string>('selectedMachine', { required: true })
const selectedBodyPart = defineModel<string>('selectedBodyPart', { required: true })
const selectedGym = defineModel<string>('selectedGym', { required: true })
const dateFrom = defineModel<string>('dateFrom', { required: true })
const dateTo = defineModel<string>('dateTo', { required: true })
</script>

<template>
  <div class="workout-filters">
    <label class="field">
      <span>Keyword</span>
      <input v-model="searchText" type="search" />
    </label>

    <label class="field">
      <span>Machine</span>
      <select v-model="selectedMachine">
        <option v-for="option in machineOptions" :key="option" :value="option">
          {{ option === 'all' ? '-' : option }}
        </option>
      </select>
    </label>

    <label class="field">
      <span>Body Part</span>
      <select v-model="selectedBodyPart">
        <option value="all">-</option>
        <option v-for="option in bodyPartOptions" :key="option" :value="option">
          {{ formatBodyPart(option) }}
        </option>
      </select>
    </label>

    <label class="field">
      <span>Gym</span>
      <select v-model="selectedGym">
        <option value="all">-</option>
        <option v-for="option in gymOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </label>

    <label class="field">
      <span>From</span>
      <input v-model="dateFrom" type="date" />
    </label>

    <label class="field">
      <span>To</span>
      <input v-model="dateTo" type="date" />
    </label>

    <div class="filter-actions" aria-live="polite">
      <button type="button" @click="$emit('reset')">Reset</button>
    </div>
  </div>
</template>

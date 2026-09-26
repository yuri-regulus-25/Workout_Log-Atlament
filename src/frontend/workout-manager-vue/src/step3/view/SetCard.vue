<template>
  <div class="confirmation-set">
    <v-icon :icon="`mdi-numeric-${number}-box-outline`" aria-hidden="true" />
    <div>
      <Row label="Reps" :value="set.reps ?? ''" suffix="reps" />
      <Row label="Weight" :value="set.weightKg ?? ''" suffix="kg" />
      <Row v-if="set.notes" label="Notes" :value="set.notes" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WorkoutSetInput } from '@workout-lab/frontend-common'
import Row from './Row.vue'
defineProps<{ set: WorkoutSetInput; number: number }>()
</script>

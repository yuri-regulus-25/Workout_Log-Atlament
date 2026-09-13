<template>
  <section class="confirmation-machine">
    <h3>{{ name }}</h3>
    <SetCard v-for="(set, index) in machine.sets" :key="index" :set="set" :number="index + 1" />
  </section>
</template>

<script setup lang="ts">
import type { WorkoutMachineInput } from '@workout-lab/frontend-common'
import SetCard from './SetCard.vue'
defineProps<{ machine: WorkoutMachineInput; name: string }>()
</script>

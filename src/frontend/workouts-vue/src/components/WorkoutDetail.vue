<script setup lang="ts">
import type { WorkoutSession } from '@workout-lab/workout-types'
import {
  formatBodyPart,
  formatDisplayDate,
  formatTotalWeight,
  getMachineVolume,
  getSessionSetCount,
  getSessionVolume,
} from '@workout-lab/workout-core'

defineProps<{
  session: WorkoutSession | null
}>()
</script>

<template>
  <section class="panel detail-panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Row selection</p>
        <h2>Workout detail</h2>
      </div>
    </div>

    <p v-if="!session" class="empty">Select a row to inspect a workout.</p>

    <div v-else class="detail-stack">
      <div class="detail-title">
        <strong>{{ formatDisplayDate(session.date) }}</strong>
        <span>{{ session.gym.name }}</span>
      </div>

      <dl class="detail-metrics">
        <div>
          <dt>Machines</dt>
          <dd>{{ session.machines.length }}</dd>
        </div>
        <div>
          <dt>Sets</dt>
          <dd>{{ getSessionSetCount(session) }}</dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd>{{ getSessionVolume(session).toLocaleString() }} kg</dd>
        </div>
      </dl>

      <article v-for="machine in session.machines" :key="machine.machine_id" class="machine-card">
        <div class="machine-header">
          <div>
            <h3>{{ machine.name }}</h3>
            <p>{{ formatBodyPart(machine.body_part) }}</p>
          </div>
          <strong>{{ formatTotalWeight(getMachineVolume(machine)) }}</strong>
        </div>
        <ul>
          <li v-for="set in machine.sets" :key="set.set">
            Set {{ set.set }} · {{ set.weight_kg }} kg × {{ set.reps }} reps
            <span v-if="set.rir !== undefined && set.rir !== null"> · RIR {{ set.rir }}</span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

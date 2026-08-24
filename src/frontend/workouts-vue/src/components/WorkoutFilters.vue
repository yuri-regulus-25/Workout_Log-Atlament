<script setup lang="ts">
defineProps<{
  machineOptions: string[]
}>()

const selectedMachine = defineModel<string>('selectedMachine', { required: true })
</script>

<template>
  <label class="field">
    <span>Machine</span>
    <select v-model="selectedMachine">
      <option v-for="option in machineOptions" :key="option" :value="option">
        {{ option === 'all' ? '-' : option }}
      </option>
    </select>
  </label>
</template>

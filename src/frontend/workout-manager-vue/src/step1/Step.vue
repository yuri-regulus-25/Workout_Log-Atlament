<template>
  <div class="step-body step-one">
    <v-row class="step-one-field">
      <v-col cols="3"><p class="field-label">ワークアウト日</p></v-col>
      <v-col cols="9"><DateField v-model="selected" :maximum="maximum" :markers="markers" /></v-col>
    </v-row>
    <v-row class="step-one-actions">
      <v-col cols="3" />
      <v-col cols="9">
        <div class="step-actions">
          <v-btn class="primary-action" variant="flat" :disabled="!selected || !writable" @click="selected && emit('next', selected)">次へ</v-btn>
        </div>
      </v-col>
    </v-row>
    <v-alert v-if="!writable" type="warning" variant="tonal" class="status-alert">{{ writeBoundaryMessage(writeReason) }}</v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DateField from './form/Date.vue'
import { writeBoundaryMessage } from './write-boundary'
const props = defineProps<{ modelValue: string | null; maximum: string; markers: string[]; writable: boolean; writeReason: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null]; next: [date: string] }>()
const selected = ref(props.modelValue)
watch(() => props.modelValue, value => selected.value = value)
watch(selected, value => emit('update:modelValue', value))
</script>

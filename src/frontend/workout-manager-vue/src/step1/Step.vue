<template>
  <div class="step-body step-one">
    <DateField v-model="selected" :maximum="maximum" :markers="markers" />
    <div class="step-actions">
      <v-btn class="primary-action" variant="flat" :disabled="!selected || !writable" @click="selected && emit('next', selected)">次へ</v-btn>
    </div>
    <v-alert v-if="!writable" type="warning" variant="tonal" density="compact">現在はワークアウトログを変更できません。</v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DateField from './form/Date.vue'
const props = defineProps<{ modelValue: string | null; maximum: string; markers: string[]; writable: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null]; next: [date: string] }>()
const selected = ref(props.modelValue)
watch(() => props.modelValue, value => selected.value = value)
watch(selected, value => emit('update:modelValue', value))
</script>

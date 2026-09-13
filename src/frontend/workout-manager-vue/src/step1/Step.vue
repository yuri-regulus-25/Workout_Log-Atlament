<template>
  <div class="step-body step-one">
    <v-alert v-if="!writable" type="warning" variant="tonal" class="status-alert mb-4">{{
      writeBoundaryMessage(writeReason)
    }}</v-alert>
    <v-row class="step-one-field">
      <v-col cols="3"><p class="field-label">ワークアウト日</p></v-col>
      <v-col cols="9"><DateField v-model="selected" :maximum="maximum" /></v-col>
    </v-row>
    <v-stepper-actions
      :disabled="!selected || !writable ? 'next' : false"
      class="step-actions"
      @click:next="continueToSession"
    >
      <template #prev />
      <template #next="{ props: actionProps }">
        <v-btn
          v-bind="actionProps"
          color="var(--wl-primary)"
          variant="flat"
          density="compact"
        />
      </template>
    </v-stepper-actions>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import DateField from "./form/Date.vue";
import { writeBoundaryMessage } from "./write-boundary";
const props = defineProps<{
  modelValue: string | null;
  maximum: string;
  writable: boolean;
  writeReason: string | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string | null]; next: [date: string] }>();
const selected = ref(props.modelValue);
watch(
  () => props.modelValue,
  (value) => (selected.value = value),
);
watch(selected, (value) => emit("update:modelValue", value));

function continueToSession() {
  if (selected.value && props.writable) emit("next", selected.value);
}
</script>

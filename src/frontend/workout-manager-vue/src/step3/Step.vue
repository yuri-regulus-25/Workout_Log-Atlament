<template>
  <div class="step-body">
    <v-alert
      :type="mode === 'delete' ? 'error' : 'info'"
      :icon="mode === 'delete' ? 'mdi-alert' : 'mdi-information'"
      density="compact"
      variant="tonal"
      class="confirmation-alert"
    >
      <template v-if="mode === 'delete'">このワークアウトログが削除されます<br />本当によろしいですか？</template>
      <template v-else>編集内容を確認し、{{ actionLabel }}を押してください</template>
    </v-alert>
    <div v-if="mode !== 'delete'" class="confirmation-content">
      <Row label="ジム" :value="gymName" />
      <MachinePanel
        v-for="(machine, index) in session.machines"
        :key="index"
        :machine="machine"
        :name="machineName(machine.machineId)"
      />
      <Row v-if="session.notes" label="Notes" :value="session.notes" />
    </div>
    <v-stepper-actions
      :disabled="busy"
      :next-text="actionLabel"
      class="step-actions"
      @click:prev="emit('back')"
      @click:next="emit('submit')"
    >
      <template #prev="{ props: actionProps }">
        <v-btn v-bind="actionProps" class="mr-2" variant="outlined" density="compact" />
      </template>
      <template #next="{ props: actionProps }">
        <v-btn
          v-bind="actionProps"
          :color="mode === 'delete' ? 'error' : 'var(--wl-primary)'"
          variant="flat"
          density="compact"
        />
      </template>
    </v-stepper-actions>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkoutMasterOption, WorkoutSessionInput } from '@workout-lab/frontend-common'
import type { Mode } from '../model'
import MachinePanel from './view/MachinePanel.vue'
import Row from './view/Row.vue'
const props = defineProps<{ mode: Mode; session: WorkoutSessionInput; gyms: WorkoutMasterOption[]; machines: WorkoutMasterOption[]; busy: boolean }>()
const emit = defineEmits<{ submit: []; back: [] }>()
const actionLabel = computed(() => props.mode === 'create' ? '登録する' : props.mode === 'update' ? '更新する' : '削除する')
const gymName = computed(() => props.gyms.find(item => item.id === props.session.gymId)?.name ?? props.session.gymId ?? '')
function machineName(id: string | null) { return props.machines.find(item => item.id === id)?.name ?? id ?? '' }
</script>

<template>
  <MaintenanceDialogFrame
    :open="open"
    title="参照先の登録情報を選択"
    primary-label="解決する"
    :primary-disabled="!resolveTargetId"
    :busy="saving"
    persistent
    @update:open="emit('update:open', $event)"
    @close="emit('update:open', false)"
    @primary="emit('resolve')"
  >
    <v-alert v-if="selectedUnresolved" type="info" variant="tonal" class="status-alert mb-4">
      {{ selectedUnresolved.referenceId }} は {{ selectedUnresolved.affectedWorkouts.length }} 件のワークアウトから参照されています。
    </v-alert>
    <v-select
      :model-value="resolveTargetId"
      label="解決先の登録情報"
      variant="outlined"
      :items="resolveOptions"
      item-title="title"
      item-value="value"
      density="compact"
      @update:model-value="emit('update:resolveTargetId', String($event))"
    />
    <v-data-table
      v-if="selectedUnresolved"
      class="maintenance-table compact-table"
        :headers="visibleAffectedHeaders"
      :items="selectedUnresolved.affectedWorkouts"
      :items-per-page-text="'Show Items'"
      density="compact"
    >
      <template #item.line="{ item }">
        {{ item.line ?? '不明' }}
      </template>
      <template #item.message="{ item }">
        <div class="affected-message">
          <span>{{ item.message }}</span>
          <span>このワークアウト記録が未登録のIDを参照しています。</span>
        </div>
      </template>
    </v-data-table>
  </MaintenanceDialogFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MaintenanceDialogFrame from './MaintenanceDialogFrame.vue'
import type { UnresolvedMasterReference } from '@workout-lab/frontend-common'

const props = defineProps<{
  open: boolean
  selectedUnresolved: UnresolvedMasterReference | null
  resolveTargetId: string
  resolveOptions: Array<{ title: string; value: string }>
  saving: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:resolveTargetId': [resolveTargetId: string]
  resolve: []
}>()

const affectedHeaders = [
  { title: 'ワークアウト', key: 'filePath' },
  { title: 'データ内の行番号', key: 'line' },
  { title: 'メッセージ', key: 'message' },
]

const visibleAffectedHeaders = computed(() => {
  const hasLine = props.selectedUnresolved?.affectedWorkouts.some((workout) => workout.line !== null && workout.line !== undefined)
  return hasLine ? affectedHeaders : affectedHeaders.filter((header) => header.key !== 'line')
})
</script>

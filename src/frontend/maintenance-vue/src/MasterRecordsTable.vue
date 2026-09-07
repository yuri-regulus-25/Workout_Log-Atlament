<template>
  <v-data-table
    :class="['maintenance-table', 'master-table', type === 'MACHINE_MASTER' ? 'machine-master-table' : 'gym-master-table']"
    :headers="headers"
    :items="records"
    :loading="loading"
    item-value="id"
    no-data-text="データがありません"
    hover
    density="comfortable"
    @click:row="handleRowClick"
  >
    <template #item.state="{ item }">
      <v-chip :color="item.deleted ? 'error' : item.active ? 'success' : 'warning'" size="small" variant="tonal">
        {{ item.deleted ? '削除済み' : item.active ? '有効' : '無効' }}
      </v-chip>
    </template>
    <template #item.main="{ item }">
      <v-icon v-if="isGym(item) && item.main" icon="mdi-star" color="primary" aria-hidden="true" />
    </template>
    <template #item.body_part="{ item }">
      {{ isMachine(item) ? formatBodyPart(item.body_part) : '' }}
    </template>
    <template #item.actions="{ item }">
      <div class="row-actions" @click.stop>
        <v-btn
          v-if="isGym(item)"
          :icon="item.main ? 'mdi-star' : 'mdi-star-outline'"
          variant="text"
          size="small"
          :disabled="item.deleted || !item.active"
          aria-label="メインジムに設定"
          @click.stop="emitMainGymRequest(item)"
        />
        <v-btn icon="mdi-content-copy" variant="text" size="small" aria-label="コピーして作成" @click.stop="$emit('copy', item)" />
        <v-btn
          :icon="item.deleted ? 'mdi-restore' : 'mdi-delete-outline'"
          variant="text"
          size="small"
          :aria-label="item.deleted ? '復元' : '削除'"
          :disabled="isGym(item) && item.main && !item.deleted"
          @click.stop="$emit('request-lifecycle-toggle', item)"
        />
      </div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { formatBodyPart } from '@workout-lab/workout-core'
import type { MasterDocumentType } from '@workout-lab/frontend-common'
import { isGym, isMachine, type GymRecord, type RecordDraft } from './maintenance-master-records'

defineProps<{
  type: MasterDocumentType
  headers: Array<Record<string, unknown>>
  records: RecordDraft[]
  loading: boolean
}>()

const emit = defineEmits<{
  'row-click': [event: MouseEvent, row: { item?: RecordDraft | { raw?: RecordDraft } }]
  copy: [record: RecordDraft]
  'request-lifecycle-toggle': [record: RecordDraft]
  'request-main-gym': [record: GymRecord]
}>()

function handleRowClick(event: MouseEvent, row: { item?: RecordDraft | { raw?: RecordDraft } }) {
  emit('row-click', event, row)
}

function emitMainGymRequest(record: RecordDraft) {
  if (isGym(record)) emit('request-main-gym', record)
}
</script>

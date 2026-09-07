<template>
  <v-dialog :model-value="open" max-width="720" persistent @update:model-value="emit('update:open', $event)">
    <v-card>
      <v-card-title>未解決参照の解決</v-card-title>
      <v-card-text>
        <v-alert v-if="selectedUnresolved" type="info" variant="tonal" class="status-alert">
          {{ selectedUnresolved.referenceId }} は {{ selectedUnresolved.affectedWorkouts.length }} 件のワークアウトに影響しています。
        </v-alert>
        <v-select
          :model-value="resolveTargetId"
          label="解決先の登録情報"
          variant="outlined"
          :items="resolveOptions"
          item-title="title"
          item-value="value"
          @update:model-value="emit('update:resolveTargetId', String($event))"
        />
        <v-data-table
          v-if="selectedUnresolved"
          class="maintenance-table compact-table"
          :headers="affectedHeaders"
          :items="selectedUnresolved.affectedWorkouts"
          density="compact"
        >
          <template #item.message="{ item }">
            <div class="affected-message">
              <span>{{ item.message }}</span>
              <span>メンテナンスを行う必要があります。</span>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:open', false)">キャンセル</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="!resolveTargetId" @click="emit('resolve')">解決</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { UnresolvedMasterReference } from '@workout-lab/frontend-common'

defineProps<{
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
  { title: '行', key: 'line' },
  { title: 'メッセージ', key: 'message' },
]
</script>

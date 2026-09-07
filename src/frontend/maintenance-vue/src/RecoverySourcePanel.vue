<template>
  <v-expansion-panels variant="accordion" class="source-panel">
    <v-expansion-panel>
      <v-expansion-panel-title>元データ</v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-alert v-if="sourceError" type="warning" variant="tonal" class="status-alert">
          元データの表示は利用できません。修復操作は続行できます。
        </v-alert>
        <pre v-else-if="sourceView" class="source-view" tabindex="0" :readOnly="true">{{ sourceView.content }}</pre>
        <v-btn v-else variant="outlined" prepend-icon="mdi-file-search-outline" :loading="sourceLoading" @click="$emit('load-source')">元データを表示</v-btn>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import type { RecoverySourceView } from '@workout-lab/frontend-common'

defineProps<{
  sourceView: RecoverySourceView | null
  sourceError: boolean
  sourceLoading: boolean
}>()

defineEmits<{
  'load-source': []
}>()
</script>

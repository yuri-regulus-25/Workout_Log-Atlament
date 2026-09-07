<template>
  <v-alert v-if="state === 'stale'" type="warning" variant="tonal" class="status-alert">
    元データが更新されています。最新の状態から修復をやり直してください。
  </v-alert>
  <v-alert v-else-if="state === 'corrupted'" type="error" variant="tonal" class="status-alert">
    下書きを読み込めません。破棄して新しく作成できます。
  </v-alert>
  <v-alert v-else-if="state === 'incompatible'" type="warning" variant="tonal" class="status-alert">
    この下書きは現在のバージョンでは使用できません。破棄して新しく作成できます。
  </v-alert>
</template>

<script setup lang="ts">
import type { RecoveryDraftSnapshot } from '@workout-lab/frontend-common'

defineProps<{
  state: RecoveryDraftSnapshot['state'] | null | undefined
}>()
</script>

<template>
  <MaintenanceDialogFrame
    :open="open"
    :title="title"
    :primary-label="dialogMode === 'create' ? '登録する' : '更新する'"
    :primary-disabled="!canSave"
    :busy="saving"
    persistent
    @update:open="emit('update:open', $event)"
    @close="emit('close')"
    @primary="emit('save')"
  >
    <v-form class="record-form" @submit.prevent="emit('save')">
      <template v-if="machineDraft">
        <v-text-field v-model.trim="machineDraft.machine_id" label="ID" variant="outlined" :error-messages="idError" :disabled="dialogMode === 'edit'" density="compact" />
        <v-text-field v-model.trim="machineDraft.name" label="名前" variant="outlined" density="compact" />
        <v-select v-model="machineDraft.body_part" label="部位" variant="outlined" :items="bodyParts" item-title="title" item-value="value" density="compact" />
        <v-text-field :model-value="aliasText" label="別名" variant="outlined" density="compact" @update:model-value="emit('update:aliasText', String($event))" />
        <v-switch v-model="machineDraft.active" label="有効" color="var(--wl-primary)" inset density="compact" />
        <v-chip v-if="machineDraft.deleted" color="error" variant="tonal">削除済み</v-chip>
      </template>
      <template v-if="gymDraft">
        <v-text-field v-model.trim="gymDraft.gym_id" label="ID" variant="outlined" :error-messages="idError" :disabled="dialogMode === 'edit'" density="compact" />
        <v-text-field v-model.trim="gymDraft.name" label="名前" variant="outlined" density="compact" />
        <v-text-field v-model.trim="gymDraft.short_name" label="短縮名" variant="outlined" density="compact" />
        <v-switch v-model="gymDraft.active" label="有効" color="var(--wl-primary)" inset density="compact" />
        <v-chip v-if="gymDraft.deleted" color="error" variant="tonal">削除済み</v-chip>
        <v-chip v-if="gymDraft.main" color="primary" variant="tonal">メインジム</v-chip>
      </template>
    </v-form>
  </MaintenanceDialogFrame>
</template>

<script setup lang="ts">
import MaintenanceDialogFrame from './MaintenanceDialogFrame.vue'
import type { GymRecord, MachineRecord } from './maintenance-master-records'

defineProps<{
  open: boolean
  title: string
  dialogMode: 'create' | 'edit'
  machineDraft: MachineRecord | null
  gymDraft: GymRecord | null
  bodyParts: Array<{ title: string; value: string }>
  aliasText: string
  idError: string
  saving: boolean
  canSave: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:aliasText': [aliasText: string]
  close: []
  save: []
}>()
</script>

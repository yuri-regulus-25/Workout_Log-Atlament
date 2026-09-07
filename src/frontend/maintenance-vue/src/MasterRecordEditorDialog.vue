<template>
  <v-dialog :model-value="open" max-width="720" persistent @update:model-value="emit('update:open', $event)">
    <v-card>
      <v-toolbar class="maintenance-dialog-toolbar" density="comfortable">
        <v-btn icon="mdi-close" variant="text" aria-label="閉じる" @click="emit('close')" />
        <v-toolbar-title>{{ title }}</v-toolbar-title>
        <v-divider vertical class="mx-0" />
        <v-btn variant="text" :loading="saving" :disabled="!canSave" @click="emit('save')">
          {{ dialogMode === 'create' ? '作成' : '更新' }}
        </v-btn>
      </v-toolbar>
      <v-card-text>
        <v-form class="record-form" @submit.prevent="emit('save')">
          <template v-if="machineDraft">
            <v-text-field v-model.trim="machineDraft.machine_id" label="ID" variant="outlined" :error-messages="idError" :disabled="dialogMode === 'edit'" density="compact" />
            <v-text-field v-model.trim="machineDraft.name" label="名前" variant="outlined" density="compact" />
            <v-select v-model="machineDraft.body_part" label="部位" variant="outlined" :items="bodyParts" item-title="title" item-value="value" density="compact" />
            <v-text-field :model-value="aliasText" label="別名" variant="outlined" density="compact" @update:model-value="emit('update:aliasText', String($event))" />
            <v-switch v-model="machineDraft.active" label="有効" color="primary" inset density="compact" />
            <v-chip v-if="machineDraft.deleted" color="error" variant="tonal">削除済み</v-chip>
          </template>
          <template v-if="gymDraft">
            <v-text-field v-model.trim="gymDraft.gym_id" label="ID" variant="outlined" :error-messages="idError" :disabled="dialogMode === 'edit'" density="compact" />
            <v-text-field v-model.trim="gymDraft.name" label="名前" variant="outlined" density="compact" />
            <v-text-field v-model.trim="gymDraft.short_name" label="短縮名" variant="outlined" density="compact" />
            <v-switch v-model="gymDraft.active" label="有効" color="primary" inset density="compact" />
            <v-chip v-if="gymDraft.deleted" color="error" variant="tonal">削除済み</v-chip>
            <v-chip v-if="gymDraft.main" color="primary" variant="tonal">メインジム</v-chip>
          </template>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
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

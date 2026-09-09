<template>
  <div class="field-list">
    <article v-for="field in sortedFields" :key="field.fieldPath" class="field-card">
      <div class="field-header">
        <div>
          <strong>{{ fieldLabel(field.fieldPath) }}</strong>
          <span>{{ fieldHelp(field.fieldPath) }}</span>
        </div>
        <v-chip size="small" :color="fieldStateColor(field)" variant="tonal">{{ fieldStateLabel(field) }}</v-chip>
      </div>
      <component :is="fieldComponent(field)" :field="field" :disabled="disabled" @change="emitChange(field.fieldPath, $event)" />
      <div v-if="suggestionsFor(field).length > 0" class="field-suggestions">
        <span>候補</span>
        <button
          v-for="suggestion in suggestionsFor(field)"
          :key="`${field.fieldPath}:${String(suggestion.suggestedValue)}`"
          type="button"
          class="suggestion-action"
          :disabled="disabled"
          @click="emit('change', { fieldPath: field.fieldPath, value: suggestion.suggestedValue })"
        >
          {{ suggestionLabel(suggestion.suggestedValue) }}
        </button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'
import type { RecoveryField, RecoverySuggestion } from '@workout-lab/frontend-common'

type EditableField = RecoveryField
type FieldChange = { value: unknown }

const props = defineProps<{
  fields: RecoveryField[]
  suggestions: RecoverySuggestion[]
  disabled: boolean
}>()

const emit = defineEmits<{
  change: [{ fieldPath: string; value: unknown }]
}>()

const sortedFields = computed(() => [...props.fields].sort((a, b) => fieldPriority(a) - fieldPriority(b) || a.fieldPath.localeCompare(b.fieldPath)))

function emitChange(fieldPath: string, change: FieldChange) {
  emit('change', { fieldPath, value: change.value })
}

function fieldLabel(path: string) {
  const key = path.split('/').filter(Boolean).at(-1) ?? path
  return {
    schema_version: '形式バージョン',
    session_id: '記録ID',
    date: '日付',
    status: '状態',
    gym_id: 'ジムID',
    condition: 'コンディション',
    machines: 'マシン',
    notes: 'メモ',
  }[key] ?? key
}

function fieldHelp(path: string) {
  const key = path.split('/').filter(Boolean).at(-1) ?? path
  return {
    schema_version: '通常は 1 です。',
    session_id: 'この記録を識別するIDです。',
    date: 'トレーニング日を選択してください。',
    status: '完了または一部記録を選択してください。',
    gym_id: '利用したジムのIDです。',
    condition: '未入力でも修復できます。',
    machines: '実施したマシンとセットを入力してください。',
    notes: '必要なメモを入力できます。',
  }[key] ?? ''
}

function fieldPriority(field: RecoveryField) {
  if (field.state === 'unresolved') return 0
  if (field.state === 'confirmed' || field.source === 'user') return 1
  return 2
}

function fieldStateLabel(field: RecoveryField) {
  if (field.state === 'unresolved') return '確認が必要'
  if (field.state === 'confirmed' || field.source === 'user') return '変更しました'
  return '復元できました'
}

function fieldStateColor(field: RecoveryField) {
  if (field.state === 'unresolved') return 'warning'
  if (field.state === 'confirmed' || field.source === 'user') return 'primary'
  return 'info'
}

function fieldValue(field: RecoveryField) {
  return 'value' in field ? field.value : undefined
}

function fieldComponent(field: RecoveryField) {
  const key = field.fieldPath.split('/').filter(Boolean).at(-1)
  if (key === 'schema_version') return NumberField
  if (key === 'date') return DateField
  if (key === 'status') return StatusField
  if (key === 'machines') return MachinesField
  if (key === 'notes') return NotesField
  if (key === 'condition') return ConditionField
  return TextField
}

function suggestionsFor(field: RecoveryField): RecoverySuggestion[] {
  return props.suggestions.filter((suggestion) => suggestion.fieldPath === field.fieldPath)
}

function suggestionLabel(value: unknown) {
  if (value === null || value === undefined || value === '') return '未入力にする'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const TextField = defineComponent({
  props: { field: { type: Object as PropType<EditableField>, required: true }, disabled: Boolean },
  emits: ['change'],
  setup(componentProps, { emit: componentEmit }) {
    const value = ref(String(fieldValue(componentProps.field) ?? ''))
    watch(() => componentProps.field, () => { value.value = String(fieldValue(componentProps.field) ?? '') })
    return () => h('label', { class: 'field-control' }, [
      h('span', '値'),
      h('input', { value: value.value, disabled: componentProps.disabled, onInput: (event: Event) => { value.value = (event.target as HTMLInputElement).value; componentEmit('change', { value: value.value }) } }),
    ])
  },
})

const NumberField = defineComponent({
  props: { field: { type: Object as PropType<EditableField>, required: true }, disabled: Boolean },
  emits: ['change'],
  setup(componentProps, { emit: componentEmit }) {
    const value = ref(Number(fieldValue(componentProps.field) ?? 1))
    return () => h('label', { class: 'field-control' }, [
      h('span', '数値'),
      h('input', { type: 'number', min: '1', value: value.value, disabled: componentProps.disabled, onInput: (event: Event) => { value.value = Number((event.target as HTMLInputElement).value); componentEmit('change', { value: value.value }) } }),
    ])
  },
})

const DateField = defineComponent({
  props: { field: { type: Object as PropType<EditableField>, required: true }, disabled: Boolean },
  emits: ['change'],
  setup(componentProps, { emit: componentEmit }) {
    const value = ref(String(fieldValue(componentProps.field) ?? ''))
    return () => h('label', { class: 'field-control' }, [
      h('span', '日付'),
      h('input', { type: 'date', value: value.value, disabled: componentProps.disabled, onInput: (event: Event) => { value.value = (event.target as HTMLInputElement).value; componentEmit('change', { value: value.value }) } }),
    ])
  },
})

const StatusField = defineComponent({
  props: { field: { type: Object as PropType<EditableField>, required: true }, disabled: Boolean },
  emits: ['change'],
  setup(componentProps, { emit: componentEmit }) {
    const value = ref(String(fieldValue(componentProps.field) ?? 'complete'))
    return () => h('label', { class: 'field-control' }, [
      h('span', '状態'),
      h('select', { value: value.value, disabled: componentProps.disabled, onChange: (event: Event) => { value.value = (event.target as HTMLSelectElement).value; componentEmit('change', { value: value.value }) } }, [
        h('option', { value: 'complete' }, '完了'),
        h('option', { value: 'partial' }, '一部記録'),
      ]),
    ])
  },
})

const NotesField = defineComponent({
  props: { field: { type: Object as PropType<EditableField>, required: true }, disabled: Boolean },
  emits: ['change'],
  setup(componentProps, { emit: componentEmit }) {
    const value = ref(Array.isArray(fieldValue(componentProps.field)) ? (fieldValue(componentProps.field) as string[]).join('\n') : '')
    return () => h('label', { class: 'field-control' }, [
      h('span', 'メモ'),
      h('textarea', { value: value.value, disabled: componentProps.disabled, rows: 3, onInput: (event: Event) => { value.value = (event.target as HTMLTextAreaElement).value; componentEmit('change', { value: value.value.split('\n').map((line) => line.trim()).filter(Boolean) }) } }),
    ])
  },
})

const ConditionField = defineComponent({
  props: { field: { type: Object as PropType<EditableField>, required: true }, disabled: Boolean },
  emits: ['change'],
  setup(componentProps, { emit: componentEmit }) {
    const fatigue = ref(Number((fieldValue(componentProps.field) as { fatigue?: number } | null)?.fatigue ?? 0))
    const motivation = ref(Number((fieldValue(componentProps.field) as { motivation?: number } | null)?.motivation ?? 0))
    const update = () => componentEmit('change', { value: fatigue.value || motivation.value ? { fatigue: fatigue.value || null, motivation: motivation.value || null } : null })
    return () => h('div', { class: 'condition-grid' }, [
      h('label', { class: 'field-control' }, [h('span', '疲労'), h('input', { type: 'number', min: '0', max: '5', value: fatigue.value, disabled: componentProps.disabled, onInput: (event: Event) => { fatigue.value = Number((event.target as HTMLInputElement).value); update() } })]),
      h('label', { class: 'field-control' }, [h('span', '意欲'), h('input', { type: 'number', min: '0', max: '5', value: motivation.value, disabled: componentProps.disabled, onInput: (event: Event) => { motivation.value = Number((event.target as HTMLInputElement).value); update() } })]),
    ])
  },
})

const MachinesField = defineComponent({
  props: { field: { type: Object as PropType<EditableField>, required: true }, disabled: Boolean },
  emits: ['change'],
  setup(componentProps, { emit: componentEmit }) {
    const machines = ref<Array<{ machine_id: string; sets: Array<{ set: number; weight_kg: number; reps: number }> }>>(normalizeMachines(fieldValue(componentProps.field)))
    const emitValue = () => componentEmit('change', { value: clone(machines.value) })
    const addMachine = () => { machines.value.push({ machine_id: '', sets: [{ set: 1, weight_kg: 0, reps: 0 }] }); emitValue() }
    const addSet = (index: number) => { machines.value[index].sets.push({ set: machines.value[index].sets.length + 1, weight_kg: 0, reps: 0 }); emitValue() }
    return () => h('div', { class: 'machines-editor' }, [
      machines.value.map((machine, machineIndex) => h('div', { class: 'machine-edit-row' }, [
        h('label', { class: 'field-control' }, [h('span', 'マシンID'), h('input', { value: machine.machine_id, disabled: componentProps.disabled, onInput: (event: Event) => { machine.machine_id = (event.target as HTMLInputElement).value; emitValue() } })]),
        machine.sets.map((set, setIndex) => h('div', { class: 'set-edit-row' }, [
          h('label', { class: 'field-control' }, [h('span', `セット${setIndex + 1}`), h('input', { type: 'number', min: '1', value: set.set, disabled: componentProps.disabled, onInput: (event: Event) => { set.set = Number((event.target as HTMLInputElement).value); emitValue() } })]),
          h('label', { class: 'field-control' }, [h('span', '重量kg'), h('input', { type: 'number', min: '0', step: '0.5', value: set.weight_kg, disabled: componentProps.disabled, onInput: (event: Event) => { set.weight_kg = Number((event.target as HTMLInputElement).value); emitValue() } })]),
          h('label', { class: 'field-control' }, [h('span', '回数'), h('input', { type: 'number', min: '0', value: set.reps, disabled: componentProps.disabled, onInput: (event: Event) => { set.reps = Number((event.target as HTMLInputElement).value); emitValue() } })]),
        ])),
        h('button', { type: 'button', class: 'inline-action', disabled: componentProps.disabled, onClick: () => addSet(machineIndex) }, 'セットを追加'),
      ])),
      h('button', { type: 'button', class: 'inline-action', disabled: componentProps.disabled, onClick: addMachine }, 'マシンを追加'),
    ])
  },
})

function normalizeMachines(value: unknown) {
  if (!Array.isArray(value)) return [{ machine_id: '', sets: [{ set: 1, weight_kg: 0, reps: 0 }] }]
  return value.map((machine) => {
    const record = typeof machine === 'object' && machine !== null ? machine as { machine_id?: unknown; sets?: unknown } : {}
    return {
      machine_id: String(record.machine_id ?? ''),
      sets: Array.isArray(record.sets) && record.sets.length > 0
        ? record.sets.map((set, index) => {
            const row = typeof set === 'object' && set !== null ? set as { set?: unknown; weight_kg?: unknown; reps?: unknown } : {}
            return { set: Number(row.set ?? index + 1), weight_kg: Number(row.weight_kg ?? 0), reps: Number(row.reps ?? 0) }
          })
        : [{ set: 1, weight_kg: 0, reps: 0 }],
    }
  })
}
</script>

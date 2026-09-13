import { describe, expect, it } from 'vitest'
import { emptyMachine } from '../model'
import stepSource from './Step.vue?raw'
import machinePanelSource from './block/MachinePanel.vue?raw'
import setCardSource from './block/SetCard.vue?raw'
import gymSource from './form/Gym.vue?raw'
import machineSource from './form/Machine.vue?raw'
import notesSource from './form/Notes.vue?raw'
import repsSource from './form/Reps.vue?raw'
import sessionSource from './form/Session.vue?raw'
import weightSource from './form/Weight.vue?raw'

describe('Workout Manager Step 2 UI contract', () => {
  it('すべての入力Componentをcompactかつoutlinedで表示する', () => {
    for (const source of [sessionSource, gymSource, machineSource, repsSource, weightSource, notesSource]) {
      expect(source).toContain('density="compact"')
      expect(source).toContain('variant="outlined"')
    }
  })

  it('各Machineの右横から独立した初期値のMachineを直後へ追加して展開する', () => {
    expect(stepSource).toContain('@add="addMachine(index)"')
    expect(stepSource).toContain(':add-disabled="working.machines.length >= 10"')
    expect(stepSource).toContain('working.value.machines.splice(index + 1, 0, emptyMachine())')
    expect(stepSource).toContain('openPanels.value = [index + 1]')
    expect(machinePanelSource).toContain('<div class="machine-row">')
    expect(machinePanelSource).toContain('class="machine-panels"')
    expect(machinePanelSource).toContain('<div class="item-actions machine-actions">')
    expect(machinePanelSource).toContain('<v-icon icon="mdi-plus-thick" size="small" />')
    expect(machinePanelSource).toContain('<v-icon icon="mdi-trash-can" size="small" />')
    expect(stepSource).not.toContain('machine-list-actions')
    expect(emptyMachine()).toEqual({
      sourceIndex: null,
      machineId: null,
      sets: [{ sourceIndex: null, reps: null, weightKg: null, notes: null }],
    })
  })

  it('MachineをExpansion Panelとして構成しValidation状態をHeaderへ表示する', () => {
    expect(machinePanelSource).toContain('<v-expansion-panel :value="index"')
    expect(machinePanelSource).toContain('<v-expansion-panel-title>')
    expect(machinePanelSource).toContain('<v-expansion-panel-text>')
    expect(machinePanelSource).not.toContain('<v-card')
    expect(machinePanelSource).toContain("'mdi-help-circle-outline'")
    expect(machinePanelSource).toContain("'mdi-check-circle'")
    expect(machinePanelSource).toContain("'mdi-alert'")
    expect(machinePanelSource).toContain("'orange'")
    expect(machinePanelSource).toContain("'green'")
    expect(machinePanelSource).toContain("'red'")
    expect(machinePanelSource).toContain("const validationFailed = computed(() => props.validated && hasErrors.value)")
    expect(machinePanelSource).toContain("{{ machineName || '？' }}")
    expect(machinePanelSource).not.toContain('<v-tooltip')
  })

  it('SetのCardを可変幅、番号とActionを内容幅で配置する', () => {
    expect(setCardSource).toContain('<div class="set-row">')
    expect(setCardSource).toContain('<div class="set-number">')
    expect(setCardSource).toContain('<v-card class="set-card pa-2"')
    expect(setCardSource).toContain('<div class="item-actions set-actions">')
    expect(setCardSource).toContain('<div class="numeric-fields">')
    expect(setCardSource).toContain('<v-icon icon="mdi-plus-thick" size="small" />')
    expect(setCardSource).toContain('<v-icon icon="mdi-trash-can" size="small" />')
  })
})

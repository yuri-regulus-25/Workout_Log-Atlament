import { describe, expect, it } from 'vitest'
import { emptyMachine } from '../model'
import stepSource from './Step.vue?raw'
import machinePanelSource from './block/MachinePanel.vue?raw'
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

  it('Machine一覧直下から独立した初期値のMachineを末尾へ追加して展開する', () => {
    const panelsEnd = stepSource.indexOf('</v-expansion-panels>')
    const addAction = stepSource.indexOf('aria-label="マシンを追加"')
    const notesField = stepSource.indexOf('<NotesField')

    expect(addAction).toBeGreaterThan(panelsEnd)
    expect(addAction).toBeLessThan(notesField)
    expect(stepSource).toContain('icon="mdi-plus-thick"')
    expect(stepSource).toContain(':disabled="working.machines.length >= 10"')
    expect(stepSource).toContain('working.value.machines.push(emptyMachine())')
    expect(stepSource).toContain('openPanels.value = [working.value.machines.length - 1]')
    expect(stepSource).not.toContain('@add="addMachine')
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
})

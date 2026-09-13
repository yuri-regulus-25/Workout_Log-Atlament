import { describe, expect, it } from 'vitest'
import appSource from './App.vue?raw'

describe('Workout Manager stepper contract', () => {
  it('Vuetify stepperで3段階の画面を構成する', () => {
    expect(appSource).toContain('<v-stepper v-model="step" :items="steps" alt-labels hide-actions')
    expect(appSource).toContain('<template #item.1>')
    expect(appSource).toContain('<template #item.2>')
    expect(appSource).toContain('<template #item.3>')
    expect(appSource).not.toContain('vertical-stepper')
  })
})

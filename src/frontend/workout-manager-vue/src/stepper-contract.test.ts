import { describe, expect, it } from 'vitest'
import appSource from './App.vue?raw'
import loadingOverlaySource from './common/LoadingOverlay.vue?raw'
import stepOneSource from './step1/Step.vue?raw'
import dateFieldSource from './step1/form/Date.vue?raw'
import stepTwoSource from './step2/Step.vue?raw'
import stepThreeSource from './step3/Step.vue?raw'
import mainSource from './main.ts?raw'

describe('Workout Manager stepper contract', () => {
  it('Vuetify stepper itemを縦方向に3段階構成する', () => {
    expect(appSource).toContain('<v-stepper v-model="step" hide-actions flat aria-orientation="vertical" class="workout-stepper workout-stepper--vertical">')
    expect(appSource.match(/<v-stepper-item/g)).toHaveLength(3)
    expect(appSource).toContain('title="操作するワークアウトの日付選択"')
    expect(appSource).toContain('title="操作内容"')
    expect(appSource).toContain('title="操作内容確認"')
  })

  it('Step 1を3/9 gridと日本語Date Pickerで構成する', () => {
    expect(stepOneSource).toContain('<v-col cols="3"><p class="field-label">ワークアウト日</p></v-col>')
    expect(stepOneSource).toContain('<v-col cols="9"><DateField')
    expect(dateFieldSource).toContain('locale="ja-JP"')
    expect(mainSource).toContain("locale: 'ja'")
  })

  it('全Stepの操作をStepper Actionsに配置し、主要ボタンをdense相当にする', () => {
    expect(stepOneSource).toContain('<v-stepper-actions')
    expect(stepOneSource).toContain('variant="flat" density="compact"')
    expect(stepTwoSource).toContain('<v-stepper-actions')
    expect(stepTwoSource).toContain('class="mr-2" variant="text"')
    expect(stepTwoSource).toContain('variant="flat" density="compact"')
    expect(stepThreeSource).toContain('<v-stepper-actions')
    expect(stepThreeSource).toContain('class="mr-2" variant="text"')
    expect(stepThreeSource).toContain('density="compact"')
  })

  it('Loading Overlayを操作領域内に表示する', () => {
    expect(appSource).toContain('</v-stepper>\n          <LoadingOverlay :active="loading" :label="loadingLabel" />\n        </section>')
    expect(loadingOverlaySource).toContain('persistent contained')
    expect(loadingOverlaySource).toContain('color="var(--wl-primary)"')
  })
})

import { describe, expect, it } from 'vitest'
import appSource from './App.vue?raw'
import loadingOverlaySource from './common/LoadingOverlay.vue?raw'
import stepOneSource from './step1/Step.vue?raw'
import dateFieldSource from './step1/form/Date.vue?raw'
import stepTwoSource from './step2/Step.vue?raw'
import stepThreeSource from './step3/Step.vue?raw'
import mainSource from './main.ts?raw'
import confirmationRowSource from './step3/view/Row.vue?raw'
import confirmationSetSource from './step3/view/SetCard.vue?raw'

describe('Workout Manager stepper contract', () => {
  it('Vuetify stepper itemを縦方向に3段階構成する', () => {
    expect(appSource).toContain('v-model="step"')
    expect(appSource).toContain('aria-orientation="vertical"')
    expect(appSource).toContain('prev-text="戻る"')
    expect(appSource).toContain('next-text="次へ"')
    expect(appSource.match(/<v-stepper-item/g)).toHaveLength(3)
    expect(appSource).not.toMatch(/workout-step-item[^\"]*pa-2/)
    expect(appSource).toContain('<v-stepper-window')
    expect(appSource.match(/<v-stepper-window-item/g)).toHaveLength(3)
    expect(appSource).not.toContain('v-show="step ===')
    expect(appSource).not.toContain('v-if="step ===')
    expect(appSource).not.toContain('<v-stepper-item editable')
    expect(appSource).toContain('title="操作するワークアウトの日付選択"')
    expect(appSource).toContain('title="操作内容"')
    expect(appSource).toContain('title="操作内容確認"')
  })

  it('Step 1を3/9 gridと日本語Date Pickerで構成する', () => {
    expect(stepOneSource).toContain('<v-col cols="3"><p class="field-label">ワークアウト日</p></v-col>')
    expect(stepOneSource).toContain('<v-col cols="9"><DateField')
    expect(dateFieldSource).toContain('<v-menu v-model="menuOpen"')
    expect(dateFieldSource).toContain('<v-text-field')
    expect(dateFieldSource).toContain('class="workout-date-field"')
    expect(dateFieldSource).toContain('prepend-icon="mdi-calendar"')
    expect(dateFieldSource).toContain('label="対象日"')
    expect(dateFieldSource).toContain('locale="ja-JP"')
    expect(dateFieldSource).toContain('header-color="var(--wl-primary)"')
    expect(dateFieldSource).toContain('hide-title')
    expect(dateFieldSource).not.toContain('hide-header')
    expect(dateFieldSource).not.toContain(':events="markers"')
    expect(dateFieldSource).not.toContain('<output')
    expect(mainSource).toContain("locale: 'ja'")
  })

  it('全Stepの操作をStepper Actionsに配置し、主要ボタンをdense相当にする', () => {
    for (const source of [stepOneSource, stepTwoSource, stepThreeSource]) {
      expect(source).toContain('class="text-white"')
      expect(source).not.toContain('step-action-activator')
    }
    expect(stepOneSource).toContain('<v-stepper-actions')
    expect(stepOneSource).toContain('@click:next="continueToSession"')
    expect(stepOneSource).toContain('variant="flat"')
    expect(stepOneSource).toContain('density="compact"')
    expect(stepTwoSource).toContain('<v-stepper-actions')
    expect(stepTwoSource).toContain('@click:prev="emit(\'back\')"')
    expect(stepTwoSource).toContain('@click:next="confirmUpdate"')
    expect(stepOneSource).toContain('color="var(--wl-primary)"')
    expect(stepTwoSource).toContain('class="mr-2" variant="outlined" density="compact"')
    expect(stepTwoSource).toContain('v-bind="{ ...tooltipProps, ...actionProps }" color="var(--wl-primary)" variant="flat" density="compact"')
    expect(stepTwoSource).not.toContain('<span v-bind="tooltipProps"')
    expect(stepTwoSource).not.toContain('primary-action')
    expect(stepTwoSource).toContain('class="ml-2" color="error" variant="outlined" density="compact"')
    expect(stepTwoSource).toContain('variant="flat" density="compact"')
    expect(stepThreeSource).toContain('<v-stepper-actions')
    expect(stepThreeSource).toContain(':next-text="actionLabel"')
    expect(stepThreeSource).toContain('@click:next="emit(\'submit\')"')
    expect(stepThreeSource).toContain('class="mr-2" variant="outlined" density="compact"')
    expect(stepThreeSource).toContain(":color=\"mode === 'delete' ? 'error' : 'var(--wl-primary)'\"")
    expect(stepThreeSource).not.toContain('primary-action')
    expect(stepThreeSource).toContain('density="compact"')
  })

  it('Step 3では選択Sessionを共通のRead Only行に表示する', () => {
    expect(appSource).toContain(':session-label="pendingSessionLabel"')
    expect(stepThreeSource).toContain('<Row label="編集するセッション" :value="sessionLabel" />')
    expect(stepThreeSource).not.toContain('<v-select')
  })

  it('SetとSessionのNotesは共通行で改行を保持して表示する', () => {
    expect(confirmationSetSource).toContain('<Row v-if="set.notes" label="Notes" :value="set.notes" />')
    expect(stepThreeSource).toContain('<Row v-if="session.notes" label="Notes" :value="session.notes" />')
    expect(confirmationRowSource).toContain('class="confirmation-value"')
    expect(confirmationRowSource).toContain('white-space: pre-wrap;')
  })

  it('Loading Overlayを全画面に表示する', () => {
    expect(appSource).toContain('</v-stepper>\n          <LoadingOverlay :active="loading" :label="loadingLabel" />\n        </section>')
    expect(loadingOverlaySource).toContain('class="manager-loading-overlay" persistent scrim=')
    expect(loadingOverlaySource).not.toContain(' contained')
    expect(loadingOverlaySource).toContain('color="var(--wl-primary)"')
  })
})

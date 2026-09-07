import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Maintenance composition contract', () => {
  it('keeps master table presentation in a dedicated Vue component', () => {
    const app = readFileSync('src/frontend/maintenance-vue/src/App.vue', 'utf8')
    const table = readFileSync('src/frontend/maintenance-vue/src/MasterRecordsTable.vue', 'utf8')

    expect(table).toContain('<v-data-table')
    expect(table).toContain("isGym(item) && item.main")
    expect(table).toContain('formatBodyPart(item.body_part)')
    expect(table).toContain("'request-lifecycle-toggle'")
    expect(table).toContain("'request-main-gym'")
    expect(app).toContain('<MasterRecordsTable')
    expect(app).not.toContain('machine-master-table')
    expect(app).not.toContain('#item.body_part')
  })

  it('keeps master editor and unresolved resolution dialogs in dedicated Vue components', () => {
    const app = readFileSync('src/frontend/maintenance-vue/src/App.vue', 'utf8')
    const editor = readFileSync('src/frontend/maintenance-vue/src/MasterRecordEditorDialog.vue', 'utf8')
    const resolution = readFileSync('src/frontend/maintenance-vue/src/UnresolvedReferenceResolutionDialog.vue', 'utf8')

    expect(app).toContain('<MasterRecordEditorDialog')
    expect(app).toContain('<UnresolvedReferenceResolutionDialog')
    expect(app).toContain('saveDialog')
    expect(app).toContain('resolveToExisting')
    expect(app).not.toContain('<v-form class="record-form"')
    expect(app).not.toContain('affectedHeaders')
    expect(editor).toContain('v-model.trim="machineDraft.machine_id"')
    expect(editor).toContain('v-model.trim="gymDraft.gym_id"')
    expect(editor).toContain('label="有効" color="primary" inset')
    expect(resolution).toContain('selectedUnresolved.affectedWorkouts')
    expect(resolution).toContain('メンテナンスを行う必要があります。')
  })
})

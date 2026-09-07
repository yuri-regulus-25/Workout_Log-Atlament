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
})

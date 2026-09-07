import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { commitRecoveryDraft } from './index'

const repoRoot = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('Maintenance Recovery UI contract', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes Recovery from the existing Maintenance app without a new frontend app', () => {
    const app = readSource('src/frontend/maintenance-vue/src/App.vue')
    const recovery = [
      readSource('src/frontend/maintenance-vue/src/RecoveryPanel.vue'),
      readSource('src/frontend/maintenance-vue/src/RecoveryDraftStateAlerts.vue'),
    ].join('\n')

    expect(app).toContain('修復が必要なデータ')
    expect(app).toContain('RecoveryPanel')
    expect(recovery).toContain('/maintenance/recovery')
    expect(recovery).toContain('修復が必要なデータはありません')
  })

  it('keeps Recovery UI purpose-limited instead of raw Git or raw JSON editing', () => {
    const recovery = readSource('src/frontend/maintenance-vue/src/RecoveryPanel.vue')

    expect(recovery).toContain('修復内容を確認')
    expect(recovery).toContain('修復を確定')
    expect(recovery).toContain('下書きを破棄')
    expect(recovery).toContain('元データ')
    expect(recovery).toContain('readOnly')
    expect(recovery).not.toMatch(/commit message/i)
    expect(recovery).not.toMatch(/generic git/i)
    expect(recovery).not.toMatch(/raw json/i)
    expect(recovery).not.toContain('replacementContent')
    expect(recovery).not.toContain('replacementPath =')
  })

  it('models draft autosave, validation invalidation, conflicts, confirmation, and reflection failure', () => {
    const recovery = readSource('src/frontend/maintenance-vue/src/RecoveryPanel.vue')

    expect(recovery).toContain('expectedDraftRevision: draft.draftRevision')
    expect(recovery).toContain('autosaveInFlight')
    expect(recovery).toContain('autosavePending')
    expect(recovery).toContain('cloneRecoveryFields(draft.fields)')
    expect(recovery).toContain('const draft = activeDraft.value')
    expect(recovery).toContain('validationInvalidated.value = validation.value !== null')
    expect(recovery).toContain('RECOVERY_DRAFT_CONFLICT')
    expect(recovery).toContain('元データが更新されています')
    expect(recovery).toContain('下書きを読み込めません')
    expect(recovery).toContain('この下書きは現在のバージョンでは使用できません')
    expect(recovery).toContain('保存済み・反映失敗')
    expect(recovery).toContain('confirmCommitOpen')
  })

  it('keeps Recovery issue and draft-state presentation in screen-local components', () => {
    const recovery = readSource('src/frontend/maintenance-vue/src/RecoveryPanel.vue')
    const issueCard = readSource('src/frontend/maintenance-vue/src/RecoveryIssueCard.vue')
    const draftStateAlerts = readSource('src/frontend/maintenance-vue/src/RecoveryDraftStateAlerts.vue')

    expect(recovery).toContain('RecoveryIssueCard')
    expect(recovery).toContain('RecoveryDraftStateAlerts')
    expect(issueCard).toContain('issue.message')
    expect(issueCard).toContain('issue.code')
    expect(draftStateAlerts).toContain("state === 'stale'")
    expect(draftStateAlerts).toContain("state === 'corrupted'")
    expect(draftStateAlerts).toContain("state === 'incompatible'")
  })

  it('keeps Recovery draft field editing in a screen-local component', () => {
    const recovery = readSource('src/frontend/maintenance-vue/src/RecoveryPanel.vue')
    const fieldEditor = readSource('src/frontend/maintenance-vue/src/RecoveryFieldEditor.vue')

    expect(recovery).toContain('RecoveryFieldEditor')
    expect(recovery).not.toContain('field-card')
    expect(fieldEditor).toContain('field-card')
    expect(fieldEditor).toContain('fieldStateLabel')
    expect(fieldEditor).toContain('suggestionLabel')
    expect(fieldEditor).toContain('normalizeMachines')
    expect(fieldEditor).toContain('マシンを追加')
    expect(fieldEditor).toContain('セットを追加')
  })

  it('keeps Recovery write conflict visible instead of emptying the commit confirmation dialog', () => {
    const recovery = readSource('src/frontend/maintenance-vue/src/RecoveryPanel.vue')
    const commitDraft = recovery.slice(recovery.indexOf('async function commitDraft'))
    const catchBlock = commitDraft.slice(commitDraft.indexOf('} catch (error) {'), commitDraft.indexOf('} finally {'))
    const writeConflictBlock = catchBlock.slice(catchBlock.indexOf("code === 'RECOVERY_WRITE_CONFLICT'"), catchBlock.indexOf("code === 'RECOVERY_DRAFT_CONFLICT'"))

    expect(catchBlock).toContain("code === 'RECOVERY_WRITE_CONFLICT'")
    expect(writeConflictBlock).toContain('confirmCommitOpen.value = false')
    expect(writeConflictBlock).toContain('validationInvalidated.value = true')
    expect(writeConflictBlock).not.toContain('reloadDetail')
    expect(recovery).toContain('再読み込みで最新状態を確認し、必要な場合は下書きを作り直してください')
  })

  it('sends only expected revisions to the Recovery commit API', async () => {
    const fetchMock = vi.fn(async (_path: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        success: true,
        errors: [],
        warnings: [],
        data: {
          committed: true,
          sourcePath: 'workouts/a.json',
          sourceRevision: 'source-a',
          replacementPath: 'workouts/a.json',
          replacementRevision: 'source-b',
          commitRevision: 'commit-a',
          pathChange: null,
          reflection: { succeeded: true, health: 'healthy', errors: [], warnings: [] },
        },
      }),
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      ...init,
    } as Response))
    vi.stubGlobal('fetch', fetchMock)

    await commitRecoveryDraft('opaque-key', {
      expectedSourceRevision: 'source-a',
      expectedDraftRevision: 3,
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(String(init.body))).toEqual({
      expectedSourceRevision: 'source-a',
      expectedDraftRevision: 3,
    })
  })

  it('does not fake Recovery commit success in the Node development runtime', () => {
    const runtime = readSource('tools/dev-runtime/development-runtime.mjs')

    expect(runtime).toContain('/commit (unsupported)')
    expect(runtime).toContain('Development Runtime does not perform Recovery Git commits.')
    expect(runtime).not.toContain('fake successful commit')
  })
})

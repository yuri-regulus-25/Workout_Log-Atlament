import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('platform behavioral parity contract', () => {
  it('keeps the runtime contract matrix aligned with Windows, Android, and shared client facts', () => {
    const matrix = readSource('docs/design/02_detailed-design/application-framework/runtime-contract-matrix.md')
    const windows = [
      'src/application/windows/Core/AfModels.cs',
      'src/application/windows/Core/AfServices.cs',
      'src/application/windows/Host/AfHttpHost.cs',
    ].map(readSource).join('\n')
    const android = readSource('src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt')
    const shared = readSource('src/shared/frontend-common/src/index.ts')

    for (const requiredContract of [
      'remote retrieval failed + LKG present',
      'remote retrieval failed + no LKG',
      'validation failed + LKG present',
      'credential invalid/expired, LKG present',
      'credential invalid/expired, no LKG',
      'unresolved Master missing/deleted only',
      'Main Gym unconfigured only',
      'runtimeData.fallbackActive',
      'quarantinedWorkoutResourceCount',
    ]) {
      expect(matrix, requiredContract).toContain(requiredContract)
    }

    for (const source of [windows, android, shared]) {
      expect(source).toContain('readiness')
      expect(source).toContain('requiredActions')
      expect(source).toContain('fallbackActive')
      expect(source).toContain('quarantinedWorkoutResourceCount')
      expect(source).toMatch(/RUNTIME_DATA_REQUIRED|RuntimeDataRequired/)
      expect(source).toMatch(/CREDENTIAL_REQUIRED|CredentialRequired/)
    }

    for (const source of [windows, android]) {
      expect(source).toContain('/master-write/boundary')
      expect(source).toContain('/master-write/unresolved')
      expect(source).toContain('/master-write/documents/')
      expect(source).toMatch(/MASTER_SYNC_REQUIRED|MasterSyncRequired/)
      expect(source).toMatch(/MASTER_WRITE_INVALID|MasterWriteInvalid/)
      expect(source).toContain('masterDocuments')
    }

    expect(android).toContain('Update $subject master: $fileName')
    expect(android).toContain("target.path.substringAfterLast('/')")
    expect(android).toContain('readLocalMasterDocuments')
    expect(android).toContain('fetchConfiguredWorkoutResources')
    expect(android).toContain('saveRuntimeDataAtomically')
    expect(windows).toContain('LoadLocalMasterDocuments')
    expect(windows).toContain('FetchWorkoutFilesAsync')
    expect(android).toContain('workoutLogWriteAllowed')
    expect(android).toContain('rawJsonWriteAllowed')
    expect(android).toContain('genericGitWriteAllowed')

    const devRuntime = readSource('tools/dev-runtime/development-runtime.mjs')
    expect(devRuntime).toContain('localRevision')
    expect(devRuntime).toContain('MASTER_SYNC_REQUIRED')
    expect(devRuntime).not.toContain("fail('MASTER_WRITE_CONFLICT'")
  })

  it('keeps Recovery public contract truthful across Windows, Android, Node, and frontend-common', () => {
    const windows = readSource('src/application/windows/Host/AfHttpHost.cs')
    const windowsCore = [
      'src/application/windows/Core/AfModels.cs',
      'src/application/windows/Core/AfServices.cs',
      'src/application/windows/Core/AfContracts.cs',
    ].map(readSource).join('\n')
    const android = readSource('src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt')
    const shared = readSource('src/shared/frontend-common/src/index.ts')
    const node = readSource('tools/dev-runtime/development-runtime.mjs')

    for (const endpoint of [
      '/recovery/resources',
      '/recovery/resources/',
      '/source',
      '/draft',
      '/validate',
      '/commit',
    ]) {
      expect(windows, endpoint).toContain(endpoint)
      expect(shared, endpoint).toContain(endpoint)
      expect(node, endpoint).toContain(endpoint)
    }
    expect(android).toContain('/recovery/resources')
    for (const action of ['source', 'draft', 'validate', 'commit']) {
      expect(android, action).toContain(`action == "${action}"`)
    }

    for (const source of [windowsCore, android, shared, node]) {
      expect(source).toContain('capabilities')
      expect(source).toContain('expectedSourceRevision')
      expect(source).toContain('expectedDraftRevision')
      expect(source).toContain('RECOVERY_UNAVAILABLE')
      expect(source).toContain('RECOVERY_WRITE_CONFLICT')
      expect(source).toContain('RECOVERY_REFLECTION_FAILED')
    }

    expect(shared).toContain('RecoveryCapabilities')
    expect(shared).toContain('RecoveryCommitRequest')
    expect(shared).toContain('commit: boolean')
    expect(android).toContain('.put("commit", eligible)')
    expect(android).toContain('Recover workout resource')
    expect(android).not.toContain('Android Recovery commit is unavailable in this build.')
    expect(android).not.toContain('"committed": true')
  })
})

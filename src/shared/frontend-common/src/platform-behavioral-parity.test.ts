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
    const android = [
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidRuntimeDataStore.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidRuntimeDataBuilder.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidGithubClient.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidConfiguredResourceFetcher.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidMasterWriteService.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidStatusComposer.kt',
    ].map(readSource).join('\n')
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
    expect(android).toContain('fetchWorkoutResources')
    expect(android).toContain('saveAtomically')
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
      'src/application/windows/Core/AfJson.cs',
      'src/application/windows/Core/GithubAccessService.cs',
      'src/application/windows/Core/RecoveryService.cs',
    ].map(readSource).join('\n')
    const android = [
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidGithubClient.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidRecoveryDraftStore.kt',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidRecoveryService.kt',
    ].map(readSource).join('\n')
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
    expect(android).toContain('pushRecoveryRelocation')
    expect(android).toContain('createCommitOnBranch')
    expect(android).toContain('expectedHeadOid')
    expect(android).toContain('fileChanges')
    expect(android).toContain('additions')
    expect(android).toContain('deletions')
    expect(android).toContain('https://api.github.com/graphql')
    expect(android).toContain('Remote repository changed before Recovery commit.')
    expect(android).not.toContain('Android Recovery commit is unavailable in this build.')
    expect(android).not.toContain('Android Recovery relocation commit is unavailable in this build.')
    expect(android).not.toContain('"committed": true')

    expect(windowsCore).toContain('RepositoryWriteOptions')
    expect(windowsCore).toContain('UnsafeRelaxedJsonEscaping')
    expect(windowsCore).toContain('WorkoutFieldOrder')
    expect(windowsCore).toContain('SerializeRepositoryWorkoutObject')
    expect(android).toContain('androidRecoveryWorkoutFieldOrder')
    expect(android).toContain('buildRecoveryObject')
    expect(android).toContain('toString(2) + "\\n"')
    expect(windowsCore).toContain('MatchesWorkoutResourceKey')
    expect(windowsCore).toContain('Recovery source revision is stale.')
    expect(android).toContain('recoveryService.resourceKey(configuration, "WORKOUT", it.source.path, expectedSourceRevision) == resourceKey')
    expect(android).toContain('Recovery source revision is stale.')
  })

  it('keeps Recovery fallback unresolved fields limited to Workout schema required fields', () => {
    const windows = readSource('src/application/windows/Core/RecoveryService.cs')
      .split('private static IEnumerable<JsonObject> UnresolvedWorkoutFields')[1]
      .split('private static JsonObject RecoveredField')[0]
    const android = readSource('src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidRecoveryService.kt')
      .split('private fun unresolvedWorkoutFields')[1]
      .split('private fun recoverableField')[0]
    const shared = readSource('src/shared/workout-data/src/index.ts')
      .split('function unresolvedWorkoutFields')[1]
      .split('function recoverableField')[0]

    for (const source of [windows, android, shared]) {
      for (const requiredField of ['/schema_version', '/session_id', '/date', '/status', '/gym_id', '/machines']) {
        expect(source).toContain(requiredField)
      }
      expect(source).toContain('/condition')
      expect(source).toContain('/notes')
      expect(source).toMatch(/RecoveredAbsentField|state['"]?: 'recovered'|\.put\("state", "recovered"\)/)
    }

    expect(windows).not.toMatch(/UnresolvedField\("\$\{prefix\}\/condition"\)|UnresolvedField\("\$\{prefix\}\/notes"\)/)
    expect(android).not.toMatch(/listOf\("\/condition", "\/notes"\)[\s\S]*"unresolved"/)
    const sharedRequired = shared.split('const required = [')[1].split('].map((fieldPath) => ({')[0]
    expect(sharedRequired).not.toContain('/condition')
    expect(sharedRequired).not.toContain('/notes')
  })
})

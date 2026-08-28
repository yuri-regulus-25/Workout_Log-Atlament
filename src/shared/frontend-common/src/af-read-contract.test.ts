import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('AF read contract refinement', () => {
  it('uses versions.applicationFramework as the single status AF version field', () => {
    const statusSources = [
      'src/shared/frontend-common/src/index.ts',
      'src/frontend/settings-solid/src/App.tsx',
      'src/application/windows/Core/AfModels.cs',
      'src/application/windows/Core/AfServices.cs',
      'src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt',
      'tools/dev-runtime/development-runtime.mjs',
    ] as const

    for (const sourcePath of statusSources) {
      expect(readSource(sourcePath), sourcePath).toMatch(/applicationFramework|ApplicationFramework/)
      expect(readSource(sourcePath), sourcePath).toMatch(/nativePackages|NativePackage/)
    }

    expect(readSource('src/shared/frontend-common/src/index.ts')).not.toMatch(/AfStatus = \{\s*version:/)
    expect(readSource('src/frontend/settings-solid/src/App.tsx')).not.toMatch(/status\?\.version(?!s)/)
    expect(readSource('src/application/windows/Core/AfModels.cs')).not.toMatch(/AfStatus\(\s*\[property: JsonPropertyName\("version"\)\]/)
    expect(readSource('src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt')).not.toContain('"version": "${BuildConfig.VERSION_NAME}"')
    expect(readSource('tools/dev-runtime/development-runtime.mjs')).not.toContain('version: versions.applicationFramework')
  })

  it('documents the refined status contract without the legacy top-level version field', () => {
    const apiContract = readSource('docs/design/02_detailed-design/application-framework/api-contract.md')
    const apiInventory = readSource('docs/design/02_detailed-design/application-framework/api-inventory.md')

    expect(apiContract).toContain('top-level `version` は公開しない')
    expect(apiInventory).toContain('no longer publishes top-level `version`')
    expect(apiContract).not.toContain('- `version`')
    expect(apiInventory).not.toContain('- `version`:')
  })
})

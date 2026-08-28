import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deriveApplicationAccessPolicy, deriveApplicationReadiness, type AfStatus } from './index'

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

  it('derives shared readiness without treating optional Main Gym context as setup failure', () => {
    const baseStatus = {
      application: { status: 'ready', degraded: false, acceptingRequests: true },
      components: {
        configuration: 'available',
        credential: 'available',
        github: 'available',
        runtimeData: 'available',
        hosting: {
          portal: 'available',
          dashboard: 'available',
          workouts: 'available',
          machines: 'available',
          analytics: 'available',
          settings: 'available',
          maintenance: 'available',
        },
      },
      requiredActions: [],
    } satisfies Pick<AfStatus, 'application' | 'components' | 'requiredActions'>

    expect(deriveApplicationReadiness({
      ...baseStatus,
      requiredActions: ['CONFIGURATION_REQUIRED', 'CREDENTIAL_REQUIRED'],
    }).state).toBe('unconfigured')
    expect(deriveApplicationReadiness({
      ...baseStatus,
      application: { status: 'degraded', degraded: true, acceptingRequests: true },
      components: { ...baseStatus.components, runtimeData: 'unavailable' },
      requiredActions: ['RUNTIME_DATA_REQUIRED'],
    }).state).toBe('unavailable')
    expect(deriveApplicationReadiness({
      ...baseStatus,
      application: { status: 'degraded', degraded: true, acceptingRequests: true },
      components: { ...baseStatus.components, github: 'degraded' },
    }).state).toBe('degraded')
    expect(deriveApplicationReadiness({
      ...baseStatus,
      components: { ...baseStatus.components, credential: 'unavailable' },
    }).state).toBe('degraded')
    expect(deriveApplicationReadiness(baseStatus).state).toBe('ready')
  })

  it('derives shared access policy for setup, runtime failure, and fallback states', () => {
    expect(deriveApplicationAccessPolicy({
      state: 'unconfigured',
      requiredActions: ['CONFIGURATION_REQUIRED'],
      unavailableComponents: ['configuration'],
      degradedComponents: [],
    })).toMatchObject({
      normalApplicationsAvailable: false,
      setupAvailable: true,
      recoveryActions: ['open-settings', 'complete-setup'],
      fallbackActive: false,
    })

    expect(deriveApplicationAccessPolicy({
      state: 'degraded',
      requiredActions: [],
      unavailableComponents: [],
      degradedComponents: ['github'],
    })).toMatchObject({
      normalApplicationsAvailable: true,
      recoveryActions: ['retry-sync', 'open-settings', 'reload'],
      restrictedComponents: ['github'],
      fallbackActive: true,
    })

    expect(deriveApplicationAccessPolicy({
      state: 'degraded',
      requiredActions: [],
      unavailableComponents: ['credential'],
      degradedComponents: [],
    })).toMatchObject({
      normalApplicationsAvailable: true,
      recoveryActions: ['update-credential', 'open-settings', 'reload'],
      fallbackActive: false,
    })

    expect(deriveApplicationAccessPolicy({
      state: 'unavailable',
      requiredActions: ['RUNTIME_DATA_REQUIRED'],
      unavailableComponents: ['runtimeData'],
      degradedComponents: [],
    })).toMatchObject({
      normalApplicationsAvailable: false,
      setupAvailable: false,
      recoveryActions: ['retry-sync', 'open-settings', 'reload'],
      fallbackActive: false,
    })
  })
})

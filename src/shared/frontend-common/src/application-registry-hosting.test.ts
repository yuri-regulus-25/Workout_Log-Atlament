import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applicationRoutes, applications } from './navigation'

const repoRoot = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const currentHostedApplicationIds = ['dashboard', 'workouts', 'machines', 'analytics', 'maintenance', 'settings'] as const

describe('application registry and hosting integration', () => {
  it('keeps the shared application registry limited to current v2.0.0 applications', () => {
    expect(applications.map((application) => application.id)).toEqual([
      'portal',
      ...currentHostedApplicationIds,
    ])

    for (const excluded of ['training-map', 'compare', 'report', 'data-explorer', 'about', 'developer-mode']) {
      expect(applications.some((application) => application.id === excluded)).toBe(false)
    }
  })

  it('keeps build, preview, and development hosting aligned to registry routes', () => {
    const buildRegistry = readSource('tools/application-registry.mjs')
    const mpaBuild = readSource('tools/build/build-mpa.mjs')
    const mpaCheck = readSource('tools/validation/check-mpa.mjs')
    const gateway = readSource('tools/dev-runtime/development-gateway.mjs')
    const watch = readSource('tools/dev-runtime/watch.mjs')

    expect(mpaBuild).toContain("from '../application-registry.mjs'")
    expect(mpaCheck).toContain("from '../application-registry.mjs'")
    expect(gateway).toContain("from '../application-registry.mjs'")
    expect(watch).toContain("from '../application-registry.mjs'")

    for (const id of currentHostedApplicationIds) {
      expect(buildRegistry, id).toContain(`distPath: '${id}'`)
    }
  })

  it('keeps platform hosting status aware of every hosted application', () => {
    const windows = readSource('src/application/windows/Core/HostingStatusService.cs')
    const android = readSource('src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt')

    for (const id of currentHostedApplicationIds) {
      expect(windows, id).toContain(`"${id}"`)
      expect(android, id).toContain(`"${id}"`)
    }
  })
})

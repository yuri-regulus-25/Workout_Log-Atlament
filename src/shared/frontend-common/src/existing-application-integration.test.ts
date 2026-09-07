import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applicationRoutes, applications, drawerApplications, portalCardApplications } from './navigation/application-registry.js'

const repoRoot = process.cwd()
const hostedApplicationIds = ['dashboard', 'workouts', 'machines', 'analytics', 'maintenance', 'settings'] as const
const excludedApplicationIds = ['training-map', 'compare', 'report', 'data-explorer', 'about', 'developer-mode'] as const

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('Phase 9 existing application integration', () => {
  it('keeps registry, Portal cards, and Drawer on the same current application identity', () => {
    expect(applications.map((application) => application.id)).toEqual(['portal', ...hostedApplicationIds])
    expect(portalCardApplications.map((application) => application.id)).toEqual([...hostedApplicationIds])
    expect(drawerApplications.map((application) => application.id)).toEqual(['portal', ...hostedApplicationIds])
    expect(portalCardApplications[2]?.id).toBe('machines')
    expect(portalCardApplications[4]?.id).toBe('maintenance')

    for (const application of applications) {
      expect(application.route).toBe(applicationRoutes[application.id])
      expect(application.displayName).toBeTruthy()
      expect(application.iconClass).toMatch(/^mdi-/)
    }

    for (const id of excludedApplicationIds) {
      expect(applications.some((application) => application.id === id)).toBe(false)
    }
  })

  it('keeps build, Development Runtime, and MPA smoke checks registry-driven', () => {
    const buildRegistry = readSource('tools/application-registry.mjs')
    const mpaBuild = readSource('tools/build/build-mpa.mjs')
    const mpaCheck = readSource('tools/validation/check-mpa.mjs')
    const gateway = readSource('tools/dev-runtime/development-gateway.mjs')
    const watch = readSource('tools/dev-runtime/watch.mjs')

    expect(buildRegistry).toContain("from '../src/shared/frontend-common/src/navigation/application-registry.js'")
    for (const source of [mpaBuild, mpaCheck, gateway, watch]) {
      expect(source).toContain('application-registry.mjs')
    }

    for (const id of hostedApplicationIds) {
      expect(buildRegistry, id).toContain(`distPath: '${id}'`)
      expect(buildRegistry, id).toContain(`sourcePath: 'src/frontend/`)
    }
  })

  it('keeps Windows and Android hosting reachable for the same existing applications and direct routes', () => {
    const windows = readSource('src/application/windows/Core/HostingStatusService.cs')
    const android = readSource('src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt')
    const buildRegistry = readSource('tools/application-registry.mjs')

    for (const id of hostedApplicationIds) {
      expect(windows, `windows ${id}`).toContain(`"${id}"`)
      expect(android, `android ${id}`).toContain(`"${id}"`)
      expect(buildRegistry, `mpa ${id}`).toContain(`smokePath: '/${id}`)
    }

    for (const route of ['workouts/2026-08-24', 'machines/known-machine']) {
      expect(windows).toContain(route.split('/')[0])
      expect(android).toContain(route.split('/')[0])
    }
  })

  it('keeps Master Maintenance connected through the formal app route and AF boundary clients', () => {
    const maintenance = readSource('src/frontend/maintenance-vue/src/App.vue')
    const maintenanceCss = readSource('src/frontend/maintenance-vue/src/style.css')
    const sharedClient = readSource('src/shared/frontend-common/src/index.ts')

    expect(maintenance).toContain("currentRouteId: 'maintenance'")
    expect(maintenance).toContain('app-shell')
    expect(maintenance).toContain('page-hero')
    expect(maintenance).toContain('pageTransitionClassName')
    expect(maintenance).not.toContain('aria-label="Refresh"')
    expect(maintenanceCss).toContain('@import "@workout-lab/shared-styles/css"')
    expect(maintenance).toContain("getMasterDocument('MACHINE_MASTER')")
    expect(maintenance).toContain("getMasterDocument('GYM_MASTER')")
    expect(maintenance).toContain('getUnresolvedMasterReferences')
    expect(maintenance).toContain('updateMasterDocument')
    expect(sharedClient).toContain('/api/v1/common/master-write/boundary')
    expect(sharedClient).toContain('/api/v1/common/master-write/unresolved')
    expect(sharedClient).toContain('/api/v1/common/master-write/documents/')
  })

  it('keeps runtime status presentation bound to AF readiness and runtimeData facts', () => {
    const typedPolicy = readSource('src/shared/frontend-common/src/index.ts')
    const browserPolicy = readSource('src/shared/frontend-common/src/af-client.js')
    const portal = readSource('src/frontend/portal/src/main.js')
    const settings = [
      readSource('src/frontend/settings-solid/src/App.tsx'),
      readSource('src/frontend/settings-solid/src/SettingsSetupAssistant.tsx'),
    ].join('\n')
    const settingsPresentation = readSource('src/frontend/settings-solid/src/settings-status-presentation.ts')

    expect(typedPolicy).toContain('runtimeData?.fallbackActive ?? false')
    expect(browserPolicy).toContain('runtimeData?.fallbackActive ?? false')
    expect(portal).toContain('status?.runtimeData?.fallbackActive === true')
    expect(settingsPresentation).toContain("status.runtimeData.currentAvailable ? '利用可能' : '利用不可'")
    expect(settings).toContain('requiredActionLabel')
    expect(settings).not.toContain('deriveApplicationAccessPolicy')
    expect(settings).not.toContain('runRecoveryAction')
  })

  it('keeps Portal Maintenance card framework icons source-controlled', () => {
    const registry = readSource('src/shared/frontend-common/src/navigation/application-registry.js')
    const portalCards = readSource('src/frontend/portal/src/portal-application-cards.js')

    expect(registry).toContain("frameworkName: 'Vue.js + Vuetify'")
    expect(registry).toContain("frameworkIcons: [")
    expect(registry).toContain("./assets/logo_vuetify.svg")
    expect(portalCards).toContain('createFrameworkStackItems')
    expect(portalCards).toContain("document.createTextNode(descriptor.text)")
    expect(portalCards).toContain("frameworkItem.className = 'framework-item'")
  })

  it('keeps Portal medium-width cards in a balanced two-column grid', () => {
    const portalCss = readSource('src/frontend/portal/src/style.css')

    expect(portalCardApplications).toHaveLength(6)
    expect(portalCss).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(portalCss).not.toContain('.app-card:last-child {\n    grid-column: 1 / -1;')
  })
})

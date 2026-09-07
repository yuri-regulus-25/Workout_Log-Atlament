import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applicationRoutes, drawerApplications, type ApplicationRouteId } from './navigation'

const repoRoot = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

function readSources(relativePaths: readonly string[]): string {
  return relativePaths.map(readSource).join('\n')
}

const sourceDocuments = [
  'src/frontend/analytics-svelte/index.html',
  'src/frontend/dashboard-react/index.html',
  'src/frontend/errors/src/404.html',
  'src/frontend/errors/src/500.html',
  'src/frontend/errors/src/503.html',
  'src/frontend/errors/src/common.html',
  'src/frontend/machines-angular/src/index.html',
  'src/frontend/maintenance-vue/index.html',
  'src/frontend/portal/src/index.html',
  'src/frontend/settings-solid/index.html',
  'src/frontend/workouts-vue/index.html',
] as const

const existingFrontendApps = [
  {
    id: 'dashboard',
    sourceFiles: ['src/frontend/dashboard-react/src/App.tsx'],
    cssFiles: ['src/frontend/dashboard-react/src/App.css', 'src/frontend/dashboard-react/src/index.css'],
    stateMarkers: {
      loading: /loadRuntimeWorkoutSessions/,
      warning: /データ取得異常/,
      empty: /データがありません/,
      error: /catch\s*\(\(?error/,
    },
  },
  {
    id: 'workouts',
    sourceFiles: [
      'src/frontend/workouts-vue/src/App.vue',
      'src/frontend/workouts-vue/src/router.ts',
      'src/frontend/workouts-vue/src/views/WorkoutsView.vue',
      'src/frontend/workouts-vue/src/views/WorkoutDetailView.vue',
    ],
    cssFiles: ['src/frontend/workouts-vue/src/style.css'],
    stateMarkers: {
      loading: /loadRuntimeWorkoutSessions/,
      warning: /データ取得異常/,
      empty: /検索条件を確認してください|Select a row to inspect a workout/,
      error: /catch\s*\(error/,
    },
  },
  {
    id: 'machines',
    sourceFiles: ['src/frontend/machines-angular/src/app/app.ts', 'src/frontend/machines-angular/src/app/app.html'],
    cssFiles: ['src/frontend/machines-angular/src/app/app.css'],
    stateMarkers: {
      loading: /loadRuntimeWorkoutSessions/,
      warning: /データ取得異常/,
      empty: /検索対象を確認してください|データがありません/,
      error: /Parameter Error|catch\s*\(error/,
    },
  },
  {
    id: 'analytics',
    sourceFiles: ['src/frontend/analytics-svelte/src/App.svelte'],
    cssFiles: ['src/frontend/analytics-svelte/src/app.css'],
    stateMarkers: {
      loading: /loadRuntimeWorkoutSessions/,
      warning: /データ取得異常/,
      empty: /データがありません/,
      error: /catch\s*\(error/,
    },
  },
  {
    id: 'settings',
    sourceFiles: ['src/frontend/settings-solid/src/App.tsx'],
    cssFiles: ['src/frontend/settings-solid/src/style.css'],
    stateMarkers: {
      loading: /aria-busy=\{loading\(\) \|\| busy\(\) !== null\}|role="status"/,
      warning: /'warning'/,
      error: /tone: 'error'/,
    },
  },
  {
    id: 'maintenance',
    sourceFiles: [
      'src/frontend/maintenance-vue/src/App.vue',
      'src/frontend/maintenance-vue/src/MasterRecordsTable.vue',
    ],
    cssFiles: ['src/frontend/maintenance-vue/src/style.css'],
    stateMarkers: {
      loading: /:loading="loading"/,
      warning: /type: 'success' \| 'error' \| 'warning'/,
      empty: /displayMode/,
      error: /type: 'error'/,
    },
  },
] as const satisfies ReadonlyArray<{
  id: Exclude<ApplicationRouteId, 'portal'>
  sourceFiles: readonly string[]
  cssFiles: readonly string[]
  stateMarkers: {
    loading: RegExp
    warning: RegExp
    empty?: RegExp
    error: RegExp
  }
}>

describe('cross-frontend test baseline', () => {
  it('keeps source documents aligned to the Japanese mobile presentation baseline', () => {
    for (const documentPath of sourceDocuments) {
      const html = readSource(documentPath)

      expect(html, documentPath).toMatch(/<html lang="ja"/)
      expect(html, documentPath).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1(?:\.0)?"/)
    }
  })

  it('guards the Phase 2-A shared presentation rules', () => {
    const baselineCss = readSources([
      'src/shared/shared-styles/src/base.css',
      'src/shared/shared-styles/src/layout.css',
      'src/shared/shared-styles/src/components.css',
    ])

    expect(baselineCss).toContain('box-sizing: border-box')
    expect(baselineCss).toContain('overflow-x: hidden')
    expect(baselineCss).toContain('-webkit-tap-highlight-color: transparent')
    expect(baselineCss).toContain('min-height: 40px')
    expect(baselineCss).toContain('env(safe-area-inset-top, 0px)')
    expect(baselineCss).toContain('prefers-reduced-motion: reduce')
    expect(baselineCss).toContain('animation-duration: 0.01ms')
    expect(baselineCss).toContain('scroll-behavior: auto')
    expect(baselineCss).toContain('.atl-navigation-layout > .app-shell')
    expect(baselineCss).toContain('grid-column: 2')
    expect(baselineCss).toContain('.app-shell > .panel + .panel')
    expect(baselineCss).toContain('.page-hero h1:focus')
    expect(baselineCss).toMatch(/input,\s*select,\s*textarea/)
  })

  it('keeps cross-app navigation metadata stable and smoke-tested by each existing app', () => {
    const drawerRouteIds = drawerApplications.map((application) => application.id)
    expect(drawerRouteIds).toEqual(['portal', 'dashboard', 'workouts', 'machines', 'analytics', 'maintenance', 'settings'])

    const routes = Object.values(applicationRoutes)
    expect(new Set(routes).size).toBe(routes.length)
    for (const route of routes) {
      expect(route).toMatch(/^\/(?:.*\/)?$/)
    }

    for (const app of existingFrontendApps) {
      const source = readSources(app.sourceFiles)

      expect(source, app.id).toContain('initializeAppNavigation')
      expect(source, app.id).toContain(`currentRouteId: '${app.id}'`)
      expect(applicationRoutes[app.id], app.id).toMatch(/^\/.+\/$/)
    }
  })

  it('keeps loading, warning, error, and applicable empty states detectable in existing apps', () => {
    for (const app of existingFrontendApps) {
      const source = readSources(app.sourceFiles)

      expect(source, `${app.id} loading`).toMatch(app.stateMarkers.loading)
      expect(source, `${app.id} warning`).toMatch(app.stateMarkers.warning)
      expect(source, `${app.id} error`).toMatch(app.stateMarkers.error)
      if (app.stateMarkers.empty) {
        expect(source, `${app.id} empty`).toMatch(app.stateMarkers.empty)
      }
    }
  })

  it('keeps responsive and accessibility smoke markers in existing apps', () => {
    for (const app of existingFrontendApps) {
      const source = readSources(app.sourceFiles)
      const css = readSources([
        ...app.cssFiles,
        'src/shared/shared-styles/src/layout.css',
        'src/shared/shared-styles/src/components.css',
      ])

      expect(source, `${app.id} labels`).toMatch(/aria-label|aria-live|aria-busy/)
      expect(source, `${app.id} decorative icons`).toMatch(/aria-hidden/)
      expect(css, `${app.id} responsive CSS`).toMatch(/@media|@container/)
      expect(css, `${app.id} stable layout CSS`).toMatch(/grid-template-columns|min-width|max-width|overflow-x/)
    }
  })

  it('keeps Workout Domain route changes focus-restored to the page heading', () => {
    const source = readSource('src/frontend/workouts-vue/src/App.vue')

    expect(source).toContain('ref="pageHeading"')
    expect(source).toContain('tabindex="-1"')
    expect(source).toContain('"$route.fullPath"')
    expect(source).toContain('this.$refs.pageHeading?.focus()')
  })

  it('keeps Master Maintenance writes constrained to reviewed operations', () => {
    const source = readSource('src/frontend/maintenance-vue/src/App.vue')

    expect(source).toContain('requestLifecycleToggle')
    expect(source).toContain('requestMainGym')
    expect(source).toContain('confirmOpen')
    expect(source).toContain('saveRecords')
    expect(source).toContain('extractRowRecord')
    expect(source).toContain('@click.stop')
    expect(source).toContain('toUserFacingMasterWriteError')
    expect(source).toContain('reportDiagnostic')
    expect(source).toContain('source_ids')
    expect(source).not.toContain('currentRevisionLabel')
    expect(source).not.toContain('aria-label="Refresh"')
    expect(source).not.toContain('v-textarea')
    expect(source).not.toMatch(/bulk/i)
    expect(source).not.toMatch(/raw json/i)
  })

  it('keeps Round 3 reviewed frontend presentation contracts', () => {
    const dashboard = readSource('src/frontend/dashboard-react/src/App.tsx')
    const machines = readSources([
      'src/frontend/machines-angular/src/app/app.ts',
      'src/frontend/machines-angular/src/app/app.html',
    ])
    const analytics = readSource('src/frontend/analytics-svelte/src/App.svelte')
    const workoutFilters = readSource('src/frontend/workouts-vue/src/components/WorkoutFilters.vue')
    const settings = readSources([
      'src/frontend/settings-solid/src/App.tsx',
      'src/frontend/settings-solid/src/settings-status-presentation.ts',
    ])
    const maintenance = readSources([
      'src/frontend/maintenance-vue/src/App.vue',
      'src/frontend/maintenance-vue/src/MasterRecordsTable.vue',
      'src/frontend/maintenance-vue/src/style.css',
    ])

    expect(dashboard).toContain('colors: [chartTheme.accent]')
    expect(machines).toContain('colors: [chartTheme.accent]')
    expect(machines).toContain('<option value="">-</option>')
    expect(machines).toContain('class="filter-actions"')
    expect(machines).toContain('>Reset</button>')
    expect(machines).not.toContain('>Clear</button>')
    expect(machines).not.toContain('filteredMachineOptions().length }} / {{ machineOptions().length')
    expect(analytics).toContain('colors: [chartTheme.accent]')
    expect(analytics).toContain('mainGymVolumeTrendReady')
    expect(analytics).toContain('{#if mainGymVolumeTrendReady}')
    expect(analytics).toContain('{#key mainGymVolumeTrendKey}')
    expect(analytics).toContain('<p class="muted">データがありません</p>')
    expect(analytics).not.toContain('記録期間全体での週あたり平均セッション数。')
    expect(analytics).toContain('<h2>ジム</h2>')
    expect(workoutFilters).not.toContain('Sort')
    expect(workoutFilters).not.toContain('Newest')
    expect(settings).not.toContain('{step.actionLabel}')
    expect(settings).not.toContain('Available /')
    expect(settings).not.toContain('Fallback /')
    expect(settings).toContain('formatCredentialDisplayDate')
    expect(settings).toContain("status.runtimeData.currentAvailable ? '利用可能' : '利用不可'")
    expect(settings).toContain('onClick={saveRepository}')
    expect(settings).toContain('onClick={saveCredential}')
    expect(settings).toContain('onClick={saveResources}')
    expect(settings).toContain('onClick={syncNow}')
    expect(maintenance).toContain('initializeCharacterEasterEgg')
    expect(maintenance).toContain('@import "@workout-lab/frontend-common/easter-egg.css"')
    expect(maintenance).toContain('class="atl-brand-row"')
    expect(maintenance).not.toContain('atl-logo-mark')
    expect(maintenance).toContain('cloneRecordDraft')
    expect(maintenance).not.toContain('structuredClone')
    expect(maintenance).toContain('formatBodyPart(item.body_part)')
    expect(maintenance).toContain('background: var(--wl-bg)')
    expect(maintenance).toContain('no-data-text="データがありません"')
    expect(maintenance).toContain('ワークアウトから参照している情報が見つからない状態です。')
    expect(maintenance).not.toContain('label="Machine ID"')
    expect(maintenance).not.toContain('label="Gym ID"')
    expect(maintenance).toContain('label="ID" variant="outlined"')
    expect(maintenance).toContain('label="有効" color="primary" inset')
    expect(maintenance).toContain('accent-create-button')
    expect(maintenance).toContain('--maintenance-accent-action-bg: var(--wl-accent)')
    expect(maintenance).toContain('--maintenance-accent-selection-bg: var(--wl-primary-soft)')
    expect(maintenance).toContain(':root[data-theme="dark"] .maintenance-shell')
    expect(maintenance).toContain('color-mix(in srgb, var(--wl-primary) 68%, black)')
    expect(maintenance).toContain('background: var(--maintenance-accent-action-bg)')
    expect(maintenance).toContain('background: var(--maintenance-accent-selection-bg)')
    expect(maintenance).not.toContain('green-darken')
    expect(maintenance).not.toContain('purple-darken')
    expect(maintenance).toContain("'master-table'")
    expect(maintenance).toContain('width: 320')
    expect(maintenance).toContain('.master-table .v-table__wrapper')
    expect(maintenance).toContain('overflow-x: auto')
    expect(maintenance).toContain('word-break: keep-all')
    expect(maintenance).toContain('.gym-master-table table')
  })
})

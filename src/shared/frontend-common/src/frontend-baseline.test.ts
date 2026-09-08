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
  'src/frontend/workouts-vue/detail.html',
  'src/frontend/workouts-vue/index.html',
] as const

const existingFrontendApps = [
  {
    id: 'dashboard',
    sourceFiles: [
      'src/frontend/dashboard-react/src/App.tsx',
      'src/frontend/dashboard-react/src/DashboardCharts.tsx',
      'src/frontend/dashboard-react/src/DashboardSections.tsx',
    ],
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
      'src/frontend/workouts-vue/src/DetailApp.vue',
      'src/frontend/workouts-vue/src/main.ts',
      'src/frontend/workouts-vue/src/main-detail.ts',
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
    sourceFiles: [
      'src/frontend/analytics-svelte/src/App.svelte',
      'src/frontend/analytics-svelte/src/AnalyticsCharts.svelte',
      'src/frontend/analytics-svelte/src/AnalyticsTables.svelte',
    ],
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
      'src/frontend/maintenance-vue/src/MaintenanceDialogFrame.vue',
      'src/frontend/maintenance-vue/src/MaintenanceLoadingOverlay.vue',
      'src/frontend/maintenance-vue/src/MaintenanceSnackbar.vue',
      'src/frontend/maintenance-vue/src/MasterRecordEditorDialog.vue',
      'src/frontend/maintenance-vue/src/MasterRecordsTable.vue',
      'src/frontend/maintenance-vue/src/UnresolvedReferenceResolutionDialog.vue',
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
    expect(baselineCss).toContain('prefers-reduced-motion: reduce')
    expect(baselineCss).toContain('animation-duration: 0.01ms')
    expect(baselineCss).toContain('scroll-behavior: auto')
    expect(baselineCss).toContain('.app-background')
    expect(baselineCss).toContain('.app-shell.atl-application-shell')
    expect(baselineCss).toContain('.app-body')
    expect(baselineCss).toContain('.app-header')
    expect(baselineCss).toContain('.app-content')
    expect(baselineCss).toContain('.app-scroll')
    expect(baselineCss).toContain('.atl-screen-content > .panel + .panel')
    expect(baselineCss).toContain('.app-title:focus')
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
      expect(source, app.id).toContain('screen:')
      expect(source, app.id).toContain('data-application-shell-content')
      expect(source, app.id).not.toContain('page-hero')
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

      expect(source, `${app.id} labels`).toMatch(/aria-label|aria-live|aria-busy|ariaLabel/)
      expect(source, `${app.id} decorative icons`).toMatch(/aria-hidden/)
      expect(css, `${app.id} responsive CSS`).toMatch(/@media|@container/)
      expect(css, `${app.id} stable layout CSS`).toMatch(/grid-template-columns|min-width|max-width|overflow-x/)
    }
  })

  it('keeps Workout Domain list and detail entry points separated', () => {
    const listRoot = readSource('src/frontend/workouts-vue/src/App.vue')
    const detailRoot = readSource('src/frontend/workouts-vue/src/DetailApp.vue')
    const listMain = readSource('src/frontend/workouts-vue/src/main.ts')
    const detailMain = readSource('src/frontend/workouts-vue/src/main-detail.ts')
    const detailHtml = readSource('src/frontend/workouts-vue/detail.html')
    const preview = readSource('tools/dev-runtime/preview-mpa.mjs')

    expect(listRoot).toContain('<WorkoutsView />')
    expect(listRoot).toContain("title: 'Workout Domain'")
    expect(listRoot).toContain("description: '過去のワークアウト記録を確認します'")
    expect(listRoot).not.toContain('<RouterView')
    expect(detailRoot).toContain('<WorkoutDetailView :date="workoutDate" />')
    expect(detailRoot).toContain("title: 'Workout Domain / Details'")
    expect(detailRoot).toContain("description: '特定のワークアウト記録を確認します'")
    expect(detailMain).toContain("import DetailApp from './DetailApp.vue'")
    expect(listMain).not.toContain('.use(router)')
    expect(detailHtml).toContain('/src/main-detail.ts')
    expect(preview).toContain("return 'workouts/detail.html'")
  })

  it('keeps Application Shell responsibilities centralized in the shared frontend layer', () => {
    const navigationUi = readSource('src/shared/frontend-common/src/navigation/navigation-ui.ts')
    const sharedCss = readSources([
      'src/shared/shared-styles/src/layout.css',
      'src/shared/shared-styles/src/components.css',
    ])
    const hostedSources = readSources(existingFrontendApps.flatMap((app) => app.sourceFiles))

    expect(navigationUi).toContain('export type AppScreenHeader')
    expect(navigationUi).toContain('function createApplicationShell')
    expect(navigationUi).toContain("background.className = 'app-background'")
    expect(navigationUi).toContain("body.className = 'app-body'")
    expect(navigationUi).toContain("header.className = 'app-header'")
    expect(navigationUi).toContain("mobileMenuButton.className = 'atl-mobile-menu-button'")
    expect(navigationUi).toContain('header.append(mobileMenuButton, title)')
    expect(navigationUi).toContain("appContent.className = 'app-content'")
    expect(navigationUi).toContain("appScroll.className = 'app-scroll'")
    expect(navigationUi).toContain('body.append(header, appContent)')
    expect(navigationUi).toContain('appContent.append(appScroll)')
    expect(navigationUi).toContain("content.classList.add('atl-screen-content')")
    expect(navigationUi).toContain('initializeCharacterEasterEgg')
    expect(navigationUi).toContain("topRegion.className = 'atl-navigation-region atl-navigation-region-top'")
    expect(navigationUi).toContain("scrollRegion.className = 'atl-navigation-region atl-navigation-region-scroll'")
    expect(navigationUi).toContain("bottomRegion.className = 'atl-navigation-region atl-navigation-region-bottom'")
    expect(navigationUi).toContain("getApplicationMetadata('portal')")
    expect(navigationUi).toContain("portalLink.classList.add('atl-navigation-portal-link')")
    expect(navigationUi).toContain("bottomRegion.append(themeTrigger)")
    expect(navigationUi).toContain("icon.className = 'mdi mdi-theme-light-dark'")
    expect(navigationUi).not.toContain("label.textContent = 'Theme'")
    expect(navigationUi).not.toContain('atl-theme-trigger-label')
    expect(navigationUi).not.toContain('createMobileHeader')
    expect(sharedCss).toContain('background: var(--wl-shell-primary-soft)')
    expect(sharedCss).toContain('linear-gradient(100deg, var(--wl-shell-primary) 0%, var(--wl-shell-primary) 8%, var(--wl-shell-primary-strong) 100%)')
    expect(sharedCss).toContain('height: 60px')
    expect(sharedCss).toContain('margin: 0 16px 16px 0')
    expect(sharedCss).toContain('border-radius: 24px')
    expect(sharedCss).toContain('background: rgb(247, 247, 245)')
    expect(sharedCss).toContain('scrollbar-width: none')
    expect(sharedCss).toContain('grid-template-rows: auto minmax(0, 1fr) auto')
    expect(sharedCss).toContain('width: 100px')
    expect(sharedCss).toContain('width: 84px')
    expect(sharedCss).toContain('height: 62px')
    expect(sharedCss).toContain('height: 48px')
    expect(sharedCss).toContain('.atl-navigation-region-scroll')
    expect(sharedCss).toContain('overscroll-behavior: contain')
    expect(sharedCss).toContain('@media (max-width: 900px)')
    expect(sharedCss).toContain('.atl-navigation-drawer-mobile')
    expect(sharedCss).toContain('max-width: calc(100vw - 56px)')
    expect(sharedCss).toContain('justify-content: center')
    expect(sharedCss).toContain('.atl-navigation-drawer-mobile .atl-theme-trigger.atl-navigation-theme-trigger')
    expect(sharedCss).toContain('display: grid')
    expect(sharedCss).toContain('background: var(--wl-overlay)')
    expect(hostedSources).not.toContain('class="page-hero"')
    expect(hostedSources).not.toContain('className="page-hero"')
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
    const dashboard = readSources([
      'src/frontend/dashboard-react/src/App.tsx',
      'src/frontend/dashboard-react/src/DashboardCharts.tsx',
      'src/frontend/dashboard-react/src/DashboardSections.tsx',
    ])
    const machines = readSources([
      'src/frontend/machines-angular/src/app/app.ts',
      'src/frontend/machines-angular/src/app/app.html',
    ])
    const analytics = readSources([
      'src/frontend/analytics-svelte/src/App.svelte',
      'src/frontend/analytics-svelte/src/AnalyticsCharts.svelte',
      'src/frontend/analytics-svelte/src/AnalyticsTables.svelte',
    ])
    const workoutFilters = readSource('src/frontend/workouts-vue/src/components/WorkoutFilters.vue')
    const settings = readSources([
      'src/frontend/settings-solid/src/App.tsx',
      'src/frontend/settings-solid/src/settings-status-presentation.ts',
    ])
    const maintenance = readSources([
      'src/frontend/maintenance-vue/src/App.vue',
      'src/frontend/maintenance-vue/src/MaintenanceDialogFrame.vue',
      'src/frontend/maintenance-vue/src/MaintenanceLoadingOverlay.vue',
      'src/frontend/maintenance-vue/src/MaintenanceSnackbar.vue',
      'src/frontend/maintenance-vue/src/MasterRecordEditorDialog.vue',
      'src/frontend/maintenance-vue/src/MasterRecordsTable.vue',
      'src/frontend/maintenance-vue/src/UnresolvedReferenceResolutionDialog.vue',
      'src/frontend/maintenance-vue/src/style.css',
    ])

    expect(dashboard).toContain('colors: [chartTheme.accent]')
    expect(machines).toContain('colors: [chartTheme.accent]')
    expect(machines).toContain('<option value="">-</option>')
    expect(machines).toContain('存在しないマシンIDが指定されています。表示するマシンを選択してください。')
    expect(machines).toContain('class="filter-actions"')
    expect(machines).toContain('>Reset</button>')
    expect(machines).not.toContain('>Clear</button>')
    expect(machines).not.toContain('filteredMachineOptions().length }} / {{ machineOptions().length')
    expect(analytics).toContain('colors: [chartTheme.accent]')
    expect(analytics).toContain('trendReady')
    expect(analytics).toContain('{#if trendReady}')
    expect(analytics).toContain('{#key trendKey}')
    expect(analytics).toContain('<p class="muted">データがありません</p>')
    expect(analytics).not.toContain('記録期間全体での週あたり平均セッション数。')
    expect(analytics).toContain("'ジム'")
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
    expect(maintenance).toContain('@import "@workout-lab/frontend-common/easter-egg.css"')
    expect(maintenance).toContain('data-application-shell-content')
    expect(maintenance).toContain("title: 'Resource Management'")
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
    expect(maintenance).toContain('<MaintenanceDialogFrame')
    expect(maintenance).toContain('maintenance-dialog-toolbar')
    expect(maintenance).toContain('<v-divider vertical class="mx-0"')
    expect(maintenance).toContain("'登録する'")
    expect(maintenance).toContain("'更新する'")
    expect(maintenance).toContain('function closeDialog()')
    expect(maintenance).not.toContain('変更を破棄しますか')
    expect(maintenance).not.toContain('discardOpen')
    expect(maintenance).toContain('<MaintenanceSnackbar')
    expect(maintenance).toContain('<MaintenanceLoadingOverlay')
    expect(maintenance).not.toContain('v-alert v-if="message"')
    expect(maintenance).toContain('.v-progress-circular__overlay')
    expect(maintenance).toContain('stroke: var(--wl-primary)')
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

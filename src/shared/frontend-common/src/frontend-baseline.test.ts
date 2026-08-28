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
      warning: /Data Load Warning/,
      empty: /No workout data loaded\./,
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
      warning: /Data Load Warning/,
      empty: /empty-result|Select a row to inspect a workout/,
      error: /catch\s*\(error/,
    },
  },
  {
    id: 'machines',
    sourceFiles: ['src/frontend/machines-angular/src/app/app.ts', 'src/frontend/machines-angular/src/app/app.html'],
    cssFiles: ['src/frontend/machines-angular/src/app/app.css'],
    stateMarkers: {
      loading: /loadRuntimeWorkoutSessions/,
      warning: /Data Load Warning/,
      empty: /条件に一致するマシンがありません|No machine history found/,
      error: /Parameter Error|catch\s*\(error/,
    },
  },
  {
    id: 'analytics',
    sourceFiles: ['src/frontend/analytics-svelte/src/App.svelte'],
    cssFiles: ['src/frontend/analytics-svelte/src/app.css'],
    stateMarkers: {
      loading: /loadRuntimeWorkoutSessions/,
      warning: /Data Load Warning/,
      empty: /直近28日間の実施マシンはありません/,
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
    expect(baselineCss).toMatch(/input,\s*select,\s*textarea/)
  })

  it('keeps cross-app navigation metadata stable and smoke-tested by each existing app', () => {
    const drawerRouteIds = drawerApplications.map((application) => application.id)
    expect(drawerRouteIds).toEqual(['portal', 'dashboard', 'workouts', 'machines', 'analytics', 'settings'])

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
})

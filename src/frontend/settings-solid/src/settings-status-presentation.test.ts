import { describe, expect, it } from 'vitest'
import type { AfError, AfStatus, CredentialStatus } from '@workout-lab/frontend-common'
import {
  buildIdentitySummary,
  displayStatus,
  resolveGithubStatus,
  runtimeDataSummary,
  toMessage,
} from './settings-status-presentation'

const baseStatus: AfStatus = {
  versions: {
    applicationFramework: '3.0.0',
    frontendFramework: '3.0.0',
    nativePackages: {
      windows: {
        version: '3.0.0',
      },
      android: {
        versionName: '3.0.0',
        versionCode: 7,
      },
    },
    build: {
      variant: 'Debug',
      debug: true,
    },
  },
  readiness: {
    state: 'ready',
    requiredActions: [],
    unavailableComponents: [],
    degradedComponents: [],
  },
  runtimeData: {
    currentAvailable: true,
    currentGeneratedAt: null,
    latestRemoteRetrieval: 'succeeded',
    latestValidation: 'succeeded',
    fallbackActive: false,
    quarantinedWorkoutResourceCount: 0,
  },
  recovery: {
    brokenResourceCount: 0,
    brokenWorkoutResourceCount: 0,
    brokenMasterResourceCount: 0,
    recoverableResourceCount: 0,
    activeDraftCount: 0,
  },
  application: {
    status: 'ready',
    degraded: false,
    acceptingRequests: true,
  },
  operations: {
    startup: 'completed',
    manualSync: 'idle',
    configurationUpdate: 'idle',
    credentialUpdate: 'idle',
    shutdown: 'idle',
  },
  components: {
    configuration: 'available',
    credential: 'available',
    github: 'available',
    runtimeData: 'available',
    hosting: {
      portal: 'available',
      dashboard: 'available',
      workouts: 'available',
      workoutManager: 'available',
      machines: 'available',
      analytics: 'available',
      settings: 'available',
      maintenance: 'available',
    },
  },
  requiredActions: [],
}

describe('settings status presentation', () => {
  it('keeps build identity and runtime labels out of the composition root', () => {
    expect(buildIdentitySummary(baseStatus)).toBe('Debug / 開発用')
    expect(buildIdentitySummary({ ...baseStatus, versions: { ...baseStatus.versions, build: { variant: 'Release', debug: false } } })).toBe('Release / 通常版')
    expect(runtimeDataSummary(baseStatus)).toBe('利用可能')
    expect(displayStatus('unconfigured')).toBe('初期設定未完了')
  })

  it('maps credential and GitHub component state to the displayed Settings label', () => {
    const credential: CredentialStatus = { configured: true, state: 'available', limitDate: null }
    expect(resolveGithubStatus(baseStatus, credential).label).toBe('利用可能')
    expect(resolveGithubStatus({ ...baseStatus, components: { ...baseStatus.components, github: 'degraded' } }, credential).label).toBe('利用不可')
    expect(resolveGithubStatus(baseStatus, { configured: false, state: 'missing', limitDate: null }).label).toBe('未設定')
  })

  it('deduplicates AF errors and preserves warning fallback text', () => {
    const errors: AfError[] = [
      { code: 'GITHUB_TIMEOUT', message: 'GitHub request timed out.', recoverable: true },
      { code: 'GITHUB_TIMEOUT', message: 'GitHub request timed out.', recoverable: true },
    ]
    expect(toMessage('warning', errors, '設定を読み込みました。').text).toBe('設定を読み込みました。 GitHubへの接続がタイムアウトしました。再度操作してください。タイムアウト秒数の再設定を検討してください。')
  })
})

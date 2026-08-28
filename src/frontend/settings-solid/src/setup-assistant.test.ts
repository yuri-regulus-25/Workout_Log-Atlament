import { describe, expect, it } from 'vitest'
import type { AfStatus, CredentialStatus, RepositoryConfiguration, ResourceConfiguration } from '@workout-lab/frontend-common'
import {
  areRequiredResourcesConfigured,
  buildSetupSteps,
  isCredentialReady,
  isRepositoryConfigured,
  isSetupReady,
} from './setup-assistant'

const repository: RepositoryConfiguration = {
  owner: 'yuri-regulus-25',
  repository: 'workout-data',
  ref: 'main',
  rootPath: '',
}

const resources: ResourceConfiguration[] = [
  { type: 'WORKOUT', path: 'workouts/', resourceKind: 'directory', required: true, emptyAllowed: false },
  { type: 'MACHINE_MASTER', path: 'master/machines.json', resourceKind: 'file', required: true, emptyAllowed: false },
  { type: 'GYM_MASTER', path: 'master/gyms.json', resourceKind: 'file', required: true, emptyAllowed: false },
]

const credential: CredentialStatus = {
  configured: true,
  state: 'available',
  limitDate: '2026-09-27',
}

const status: AfStatus = {
  versions: {
    applicationFramework: '2.0.0',
    frontendFramework: '2.0.0',
    nativePackages: {
      windows: { version: '2.0.0' },
      android: { versionName: '2.0.0', versionCode: 200 },
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
    currentGeneratedAt: '2026-08-28T00:00:00Z',
    latestRemoteRetrieval: 'succeeded',
    latestValidation: 'succeeded',
    fallbackActive: false,
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
      machines: 'available',
      analytics: 'available',
      settings: 'available',
      maintenance: 'available',
    },
  },
  requiredActions: [],
}

describe('setup assistant state', () => {
  it('uses domain readiness as the setup completion source', () => {
    expect(isSetupReady(status)).toBe(true)
    expect(isSetupReady({
      ...status,
      readiness: { ...status.readiness, state: 'degraded', requiredActions: ['RUNTIME_DATA_REQUIRED'] },
    })).toBe(false)
  })

  it('derives guided steps without requiring Main Gym context', () => {
    const steps = buildSetupSteps({
      status,
      credential,
      repository,
      resources,
    })

    expect(steps.map((step) => [step.id, step.state])).toEqual([
      ['repository', 'complete'],
      ['credential', 'complete'],
      ['resources', 'complete'],
      ['validation', 'complete'],
    ])
  })

  it('blocks later steps until prerequisite inputs are available', () => {
    const steps = buildSetupSteps({
      status: null,
      credential: { configured: false, state: 'missing', limitDate: null },
      repository: { ...repository, owner: '' },
      resources: [],
    })

    expect(steps.map((step) => [step.id, step.state])).toEqual([
      ['repository', 'current'],
      ['credential', 'blocked'],
      ['resources', 'blocked'],
      ['validation', 'blocked'],
    ])
  })

  it('checks required repository, credential, and resource inputs', () => {
    expect(isRepositoryConfigured(repository)).toBe(true)
    expect(isRepositoryConfigured({ ...repository, ref: '' })).toBe(false)
    expect(isCredentialReady(credential)).toBe(true)
    expect(isCredentialReady({ ...credential, state: 'expired' })).toBe(false)
    expect(areRequiredResourcesConfigured(resources)).toBe(true)
    expect(areRequiredResourcesConfigured(resources.map((resource) => (
      resource.type === 'WORKOUT' ? { ...resource, resourceKind: 'file' } : resource
    )))).toBe(false)
    expect(areRequiredResourcesConfigured(resources.filter((resource) => resource.type !== 'GYM_MASTER'))).toBe(false)
  })
})

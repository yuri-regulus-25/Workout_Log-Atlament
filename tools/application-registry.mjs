import { join } from 'node:path'
import {
  applications as sharedApplications,
  portalCardApplications as sharedHostedApplications,
} from '../src/shared/frontend-common/src/navigation/application-registry.js'

const buildIntegration = {
  portal: {
    devPort: 5174,
  },
  dashboard: {
    distPath: 'dashboard',
    sourcePath: 'src/frontend/dashboard-react/dist',
    devPort: 5175,
    smokePath: '/dashboard/',
  },
  workouts: {
    distPath: 'workouts',
    sourcePath: 'src/frontend/workouts-vue/dist',
    devPort: 5176,
    smokePath: '/workouts/',
    dynamicSmokePath: '/workouts/2026-08-14',
  },
  machines: {
    distPath: 'machines',
    sourcePath: 'src/frontend/machines-angular/dist/machines-angular/browser',
    devPort: 5177,
    smokePath: '/machines/pec-deck',
  },
  analytics: {
    distPath: 'analytics',
    sourcePath: 'src/frontend/analytics-svelte/dist',
    devPort: 5178,
    smokePath: '/analytics/',
  },
  settings: {
    distPath: 'settings',
    sourcePath: 'src/frontend/settings-solid/dist',
    devPort: 5179,
    smokePath: '/settings/',
  },
  maintenance: {
    distPath: 'maintenance',
    sourcePath: 'src/frontend/maintenance-vue/dist',
    devPort: 5181,
    smokePath: '/maintenance/',
  },
}

export const portalApplication = withBuildIntegration(sharedApplications.find((application) => application.id === 'portal'))
export const hostedApplications = sharedHostedApplications.map(withBuildIntegration)
export const applications = [portalApplication, ...hostedApplications]

export function resolveApplicationSource(root, application) {
  return join(root, application.sourcePath)
}

function withBuildIntegration(application) {
  const integration = buildIntegration[application.id]
  if (!integration) {
    throw new Error(`Missing build integration metadata for application: ${application.id}`)
  }

  return {
    ...application,
    ...integration,
  }
}

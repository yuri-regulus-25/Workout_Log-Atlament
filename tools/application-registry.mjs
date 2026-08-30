import { join } from 'node:path'

export const portalApplication = {
  id: 'portal',
  route: '/',
  displayName: 'Portal',
  devPort: 5174,
}

export const hostedApplications = [
  {
    id: 'dashboard',
    route: '/dashboard/',
    displayName: 'Dashboard',
    distPath: 'dashboard',
    sourcePath: 'src/frontend/dashboard-react/dist',
    devPort: 5175,
    smokePath: '/dashboard/',
  },
  {
    id: 'workouts',
    route: '/workouts/',
    displayName: 'Workout Domain',
    distPath: 'workouts',
    sourcePath: 'src/frontend/workouts-vue/dist',
    devPort: 5176,
    smokePath: '/workouts/',
    dynamicSmokePath: '/workouts/2026-08-14',
  },
  {
    id: 'machines',
    route: '/machines/',
    displayName: 'Performance Detail',
    distPath: 'machines',
    sourcePath: 'src/frontend/machines-angular/dist/machines-angular/browser',
    devPort: 5177,
    smokePath: '/machines/pec-deck',
  },
  {
    id: 'analytics',
    route: '/analytics/',
    displayName: 'Analytics',
    distPath: 'analytics',
    sourcePath: 'src/frontend/analytics-svelte/dist',
    devPort: 5178,
    smokePath: '/analytics/',
  },
  {
    id: 'settings',
    route: '/settings/',
    displayName: 'Application Settings',
    distPath: 'settings',
    sourcePath: 'src/frontend/settings-solid/dist',
    devPort: 5179,
    smokePath: '/settings/',
  },
  {
    id: 'maintenance',
    route: '/maintenance/',
    displayName: 'Master Maintenance',
    distPath: 'maintenance',
    sourcePath: 'src/frontend/maintenance-vue/dist',
    devPort: 5181,
    smokePath: '/maintenance/',
  },
]

export const applications = [portalApplication, ...hostedApplications]

export function resolveApplicationSource(root, application) {
  return join(root, application.sourcePath)
}

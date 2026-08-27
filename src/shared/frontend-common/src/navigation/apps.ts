import { applicationRoutes, type ApplicationRoute, type ApplicationRouteId } from './routes'

export type ApplicationMetadata = {
  id: ApplicationRouteId
  route: ApplicationRoute
  displayName: string
  iconClass: string
  drawer: boolean
}

export const applications = [
  {
    id: 'portal',
    route: applicationRoutes.portal,
    displayName: 'Portal',
    iconClass: 'mdi-crop-portrait',
    drawer: false,
  },
  {
    id: 'dashboard',
    route: applicationRoutes.dashboard,
    displayName: 'Dashboard',
    iconClass: 'mdi-view-dashboard-outline',
    drawer: true,
  },
  {
    id: 'workouts',
    route: applicationRoutes.workouts,
    displayName: 'Workout Domain',
    iconClass: 'mdi-view-list-outline',
    drawer: true,
  },
  {
    id: 'exercises',
    route: applicationRoutes.exercises,
    displayName: 'Performance Detail',
    iconClass: 'mdi-chart-multiple',
    drawer: true,
  },
  {
    id: 'analytics',
    route: applicationRoutes.analytics,
    displayName: 'Analytics',
    iconClass: 'mdi-poll',
    drawer: true,
  },
  {
    id: 'settings',
    route: applicationRoutes.settings,
    displayName: 'Application Settings',
    iconClass: 'mdi-cog-outline',
    drawer: true,
  },
] as const satisfies readonly ApplicationMetadata[]

export function getApplicationMetadata(id: ApplicationRouteId): ApplicationMetadata {
  return applications.find((application) => application.id === id) ?? {
    id,
    route: applicationRoutes[id],
    displayName: id,
    iconClass: 'mdi-circle-outline',
    drawer: id !== 'portal',
  }
}

export const drawerApplications = applications

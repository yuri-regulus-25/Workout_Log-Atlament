import { applicationRoutes, type ApplicationRoute, type ApplicationRouteId } from './routes'

export type ApplicationMetadata = {
  id: ApplicationRouteId
  route: ApplicationRoute
  displayName: string
}

export const applications = [
  {
    id: 'portal',
    route: applicationRoutes.portal,
    displayName: 'Portal',
  },
  {
    id: 'dashboard',
    route: applicationRoutes.dashboard,
    displayName: 'Dashboard',
  },
  {
    id: 'workouts',
    route: applicationRoutes.workouts,
    displayName: 'Workout History',
  },
  {
    id: 'exercises',
    route: applicationRoutes.exercises,
    displayName: 'Performance Detail',
  },
  {
    id: 'analytics',
    route: applicationRoutes.analytics,
    displayName: 'Analytics',
  },
  {
    id: 'settings',
    route: applicationRoutes.settings,
    displayName: 'Application Settings',
  },
] as const satisfies readonly ApplicationMetadata[]

export function getApplicationMetadata(id: ApplicationRouteId): ApplicationMetadata {
  return applications.find((application) => application.id === id) ?? {
    id,
    route: applicationRoutes[id],
    displayName: id,
  }
}

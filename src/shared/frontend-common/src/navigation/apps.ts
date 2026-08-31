import {
  applications as applicationRegistry,
  drawerApplications as drawerApplicationRegistry,
  getApplicationMetadata as getRegisteredApplicationMetadata,
  type ApplicationMetadata as RegisteredApplicationMetadata,
} from './application-registry.js'
import { applicationRoutes, type ApplicationRoute, type ApplicationRouteId } from './routes'

export type ApplicationMetadata = {
  id: ApplicationRouteId
  route: ApplicationRoute
  displayName: string
  iconClass: string
  drawer: boolean
}

export const applications = applicationRegistry.map(toApplicationMetadata) as readonly ApplicationMetadata[]

export function getApplicationMetadata(id: ApplicationRouteId): ApplicationMetadata {
  return toApplicationMetadata(getRegisteredApplicationMetadata(id)) ?? {
    id,
    route: applicationRoutes[id],
    displayName: id,
    iconClass: 'mdi-circle-outline',
    drawer: id !== 'portal',
  }
}

export const drawerApplications = drawerApplicationRegistry.map(toApplicationMetadata) as readonly ApplicationMetadata[]

function toApplicationMetadata(application: RegisteredApplicationMetadata | null): ApplicationMetadata | null {
  if (!application) return null
  return {
    id: application.id,
    route: application.route,
    displayName: application.displayName,
    iconClass: application.iconClass,
    drawer: application.drawer,
  }
}

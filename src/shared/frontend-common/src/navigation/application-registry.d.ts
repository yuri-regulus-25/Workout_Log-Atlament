export type ApplicationMetadata = {
  id: 'portal' | 'dashboard' | 'workouts' | 'machines' | 'analytics' | 'settings' | 'maintenance'
  route: '/' | '/dashboard/' | '/workouts/' | '/machines/' | '/analytics/' | '/settings/' | '/maintenance/'
  displayName: string
  iconClass: string
  drawer: boolean
  portalCategory?: string
  portalPointer?: string
  frameworkName?: string
  frameworkIconHref?: string
  frameworkIconClass?: string
}

export const applications: readonly ApplicationMetadata[]
export const drawerApplications: readonly ApplicationMetadata[]
export const portalCardApplications: readonly ApplicationMetadata[]
export function getApplicationMetadata(id: ApplicationMetadata['id']): ApplicationMetadata | null

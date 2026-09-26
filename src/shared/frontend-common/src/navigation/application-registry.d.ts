export type ApplicationMetadata = {
  id: 'portal' | 'dashboard' | 'workouts' | 'workout-manager' | 'machines' | 'analytics' | 'settings' | 'maintenance'
  route: '/' | '/dashboard/' | '/workouts/' | '/workout-manager/' | '/machines/' | '/analytics/' | '/settings/' | '/maintenance/'
  displayName: string
  iconClass: string
  drawer: boolean
  portalCategory?: string
  portalPointer?: string
  portalDescription?: string
  frameworkName?: string
  frameworkIcons?: ReadonlyArray<{
    name: string
    href: string
  }>
  frameworkIconHref?: string
  frameworkIconClass?: string
}

export const applications: readonly ApplicationMetadata[]
export const applicationRoutes: Record<ApplicationMetadata['id'], ApplicationMetadata['route']>
export const drawerApplications: readonly ApplicationMetadata[]
export const portalCardApplications: readonly ApplicationMetadata[]
export function getApplicationMetadata(id: ApplicationMetadata['id']): ApplicationMetadata | null

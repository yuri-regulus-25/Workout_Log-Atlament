export const applicationRoutes = {
  portal: '/',
  dashboard: '/dashboard/',
  workouts: '/workouts/',
  machines: '/machines/',
  analytics: '/analytics/',
  settings: '/settings/',
  maintenance: '/maintenance/',
} as const

export type ApplicationRouteId = keyof typeof applicationRoutes
export type ApplicationRoute = (typeof applicationRoutes)[ApplicationRouteId]

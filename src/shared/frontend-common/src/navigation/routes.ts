export const applicationRoutes = {
  portal: '/',
  dashboard: '/dashboard/',
  workouts: '/workouts/',
  'workout-manager': '/workout-manager/',
  machines: '/machines/',
  analytics: '/analytics/',
  settings: '/settings/',
  maintenance: '/maintenance/',
} as const

export type ApplicationRouteId = keyof typeof applicationRoutes
export type ApplicationRoute = (typeof applicationRoutes)[ApplicationRouteId]

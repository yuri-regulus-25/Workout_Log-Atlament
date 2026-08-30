export const applications = [
  {
    id: 'portal',
    route: '/',
    displayName: 'Portal',
    iconClass: 'mdi-crop-portrait',
    drawer: false,
  },
  {
    id: 'dashboard',
    route: '/dashboard/',
    displayName: 'Dashboard',
    iconClass: 'mdi-view-dashboard-outline',
    drawer: true,
    portalCategory: 'Overview',
    portalPointer: '今のトレーニングを知る',
    frameworkName: 'React',
    frameworkIconHref: '/dashboard/favicon.svg',
  },
  {
    id: 'workouts',
    route: '/workouts/',
    displayName: 'Workout Domain',
    iconClass: 'mdi-view-list-outline',
    drawer: true,
    portalCategory: 'History',
    portalPointer: 'これまでの記録を辿る',
    frameworkName: 'Vue.js',
    frameworkIconHref: '/workouts/favicon.svg',
  },
  {
    id: 'machines',
    route: '/machines/',
    displayName: 'Performance Detail',
    iconClass: 'mdi-chart-multiple',
    drawer: true,
    portalCategory: 'Movement',
    portalPointer: '種目ごとの変化を追う',
    frameworkName: 'Angular',
    frameworkIconHref: '/machines/favicon.svg',
  },
  {
    id: 'analytics',
    route: '/analytics/',
    displayName: 'Analytics',
    iconClass: 'mdi-poll',
    drawer: true,
    portalCategory: 'Insights',
    portalPointer: 'データから傾向を見つける',
    frameworkName: 'Svelte',
    frameworkIconHref: '/analytics/favicon.svg',
  },
  {
    id: 'settings',
    route: '/settings/',
    displayName: 'Application Settings',
    iconClass: 'mdi-cog-outline',
    drawer: true,
    portalCategory: 'Configuration',
    portalPointer: '外の世界との繋がりを定める',
    frameworkName: 'SolidJS',
    frameworkIconHref: '/settings/favicon.svg',
  },
  {
    id: 'maintenance',
    route: '/maintenance/',
    displayName: 'Master Maintenance',
    iconClass: 'mdi-database-edit-outline',
    drawer: true,
    portalCategory: 'Master Data',
    portalPointer: 'GymとMachineを整える',
    frameworkName: 'Vue + Vuetify',
    frameworkIconClass: 'mdi-vuejs',
  },
]

export const applicationRoutes = Object.fromEntries(
  applications.map((application) => [application.id, application.route]),
)

export const drawerApplications = applications
export const portalCardApplications = applications.filter((application) => application.id !== 'portal')

export function getApplicationMetadata(id) {
  return applications.find((application) => application.id === id) ?? null
}

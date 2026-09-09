export const applications = [
  {
    id: 'portal',
    route: '/',
    displayName: 'Portal',
    iconClass: 'mdi-bulletin-board',
    drawer: false,
  },
  {
    id: 'dashboard',
    route: '/dashboard/',
    displayName: 'Dashboard',
    iconClass: 'mdi-view-dashboard-outline',
    drawer: true,
    portalCategory: 'Overview',
    portalPointer: '参照 - 状況',
    portalDescription: '現在のトレーニング状況を確認します',
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
    portalPointer: '参照 - 履歴',
    portalDescription: '過去のワークアウト記録を確認します',
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
    portalPointer: '分析 - 種目',
    portalDescription: '種目ごとの記録と推移を確認します',
    frameworkName: 'Angular',
    frameworkIconHref: '/machines/favicon.svg',
  },
  {
    id: 'analytics',
    route: '/analytics/',
    displayName: 'Analytics',
    iconClass: 'mdi-chart-box-outline',
    drawer: true,
    portalCategory: 'Insights',
    portalPointer: '分析 - 全体',
    portalDescription: 'ワークアウトデータをさまざまな視点から分析します',
    frameworkName: 'Svelte',
    frameworkIconHref: '/analytics/favicon.svg',
  },
  {
    id: 'maintenance',
    route: '/maintenance/',
    displayName: 'Resource Management',
    iconClass: 'mdi-database-edit-outline',
    drawer: true,
    portalCategory: 'Governance',
    portalPointer: '管理 - 資源',
    portalDescription: '登録情報の変更や、未解決の参照を確認します',
    frameworkName: 'Vue.js + Vuetify',
    frameworkIcons: [
      { name: 'Vue.js', href: '/workouts/favicon.svg' },
      { name: 'Vuetify', href: '/maintenance/favicon.svg' },
    ],
  },
  {
    id: 'settings',
    route: '/settings/',
    displayName: 'Application Settings',
    iconClass: 'mdi-cog-outline',
    drawer: true,
    portalCategory: 'Configuration',
    portalPointer: '管理 - 設定',
    portalDescription: '接続先や同期など、アプリケーションの動作を設定します',
    frameworkName: 'SolidJS',
    frameworkIconHref: '/settings/favicon.svg',
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

import { describe, expect, it } from 'vitest'
import { createFrameworkStackDescriptors } from './portal-application-cards.js'

describe('portal application card presentation', () => {
  it('keeps application icons separate from framework icons', () => {
    expect(createFrameworkStackDescriptors({
      frameworkName: 'React',
      frameworkIconHref: '/dashboard/favicon.svg',
      iconClass: 'mdi-view-dashboard-outline',
    })).toEqual([
      { type: 'framework', name: 'React', href: '/dashboard/favicon.svg' },
    ])
  })

  it('keeps Resource Management framework labels aligned with Vue and Vuetify favicons', () => {
    expect(createFrameworkStackDescriptors({
      frameworkName: 'Vue.js + Vuetify',
      iconClass: 'mdi-database-edit-outline',
      frameworkIcons: [
        { name: 'Vue.js', href: '/workouts/favicon.svg' },
        { name: 'Vuetify', href: '/maintenance/favicon.svg' },
      ],
    })).toEqual([
      { type: 'framework', name: 'Vue.js', href: '/workouts/favicon.svg' },
      { type: 'separator', text: ' + ' },
      { type: 'framework', name: 'Vuetify', href: '/maintenance/favicon.svg' },
    ])
  })
})

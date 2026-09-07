import { describe, expect, it } from 'vitest'
import { createFrameworkStackDescriptors } from './portal-application-cards.js'

describe('portal application card presentation', () => {
  it('keeps multi-framework labels aligned with their icons', () => {
    const descriptors = createFrameworkStackDescriptors({
      frameworkName: 'React + Svelte',
      iconClass: 'mdi-chart-line',
      frameworkIcons: [
        { href: './react.svg' },
        { href: './svelte.svg', className: 'mdi-fire' },
      ],
    })

    expect(descriptors).toEqual([
      { type: 'framework', name: 'React', icon: { href: './react.svg', className: 'mdi-chart-line' } },
      { type: 'separator', text: ' + ' },
      { type: 'framework', name: 'Svelte', icon: { href: './svelte.svg', className: 'mdi-fire' } },
    ])
  })

  it('falls back to the application icon when no framework icon is present', () => {
    expect(createFrameworkStackDescriptors({
      frameworkName: 'Vanilla',
      iconClass: 'mdi-apps',
    })).toEqual([
      { type: 'framework', name: 'Vanilla', icon: { href: undefined, className: 'mdi-apps' } },
    ])
  })
})

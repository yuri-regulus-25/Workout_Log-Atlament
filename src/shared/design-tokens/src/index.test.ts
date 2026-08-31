import { afterEach, describe, expect, it, vi } from 'vitest'
import { getChartTheme } from './index'

describe('design token chart theme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes the configured accent token for chart consumers', () => {
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => {
        if (name === '--wl-theme-name') return 'light'
        if (name === '--wl-primary') return '#111111'
        if (name === '--wl-accent') return '#abcdef'
        if (name === '--wl-secondary') return '#222222'
        return ''
      },
    }))

    const element = {
      classList: { contains: () => false },
      getAttribute: () => null,
    } as unknown as Element

    expect(getChartTheme(element)).toMatchObject({
      primary: '#111111',
      accent: '#abcdef',
      secondary: '#222222',
    })
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
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

  it('keeps brand color tokens stable between light and dark modes', () => {
    const css = readFileSync('src/shared/design-tokens/src/tokens.css', 'utf8')
    const darkBlock = css.match(/:root\[data-theme="dark"\],[\s\S]*?\.atl-theme-dark \{([\s\S]*?)\n\}/)?.[1] ?? ''
    const darkVioletBlock = css.match(/:root\[data-theme="dark"\]\[data-brand="violet"\],[\s\S]*?\.atl-theme-dark\[data-brand="violet"\] \{([\s\S]*?)\n\}/)?.[1] ?? ''
    const stableTokens = [
      '--wl-primary',
      '--wl-primary-strong',
      '--wl-primary-soft',
      '--wl-accent',
      '--wl-accent-strong',
      '--wl-secondary',
      '--wl-secondary-strong',
      '--wl-brand',
      '--wl-shell-primary',
      '--wl-shell-primary-strong',
      '--wl-shell-primary-soft',
    ]

    for (const token of stableTokens) {
      expect(darkBlock).not.toContain(`${token}:`)
      expect(darkVioletBlock).not.toContain(`${token}:`)
    }
  })
})

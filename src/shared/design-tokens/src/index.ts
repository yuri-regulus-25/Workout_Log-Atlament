export const colors = {
  background: '#f4f6fb',
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  text: '#172033',
  textStrong: '#111827',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: '#10b981',
  primaryStrong: '#0f766e',
  secondary: '#2563eb',
} as const

export type ThemeName = 'light' | 'dark'

export type ChartTheme = {
  mode: ThemeName
  primary: string
  secondary: string
  text: string
  textMuted: string
  border: string
  grid: string
  tooltipBackground: string
  tooltipText: string
}

export const radii = {
  card: '24px',
  control: '999px',
  inner: '18px',
} as const

export function getThemeName(element: Element = document.documentElement): ThemeName {
  return element.getAttribute('data-theme') === 'dark' || element.classList.contains('atl-theme-dark')
    ? 'dark'
    : 'light'
}

export function getThemeToken(name: string, fallback: string, element: Element = document.documentElement): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim()
  return value || fallback
}

export function getChartTheme(element: Element = document.documentElement): ChartTheme {
  return {
    mode: getThemeName(element),
    primary: getThemeToken('--wl-primary', colors.primary, element),
    secondary: getThemeToken('--wl-secondary', colors.secondary, element),
    text: getThemeToken('--wl-text', colors.text, element),
    textMuted: getThemeToken('--wl-text-muted', colors.textMuted, element),
    border: getThemeToken('--wl-border', colors.border, element),
    grid: getThemeToken('--wl-chart-grid', colors.border, element),
    tooltipBackground: getThemeToken('--wl-chart-tooltip-bg', colors.surface, element),
    tooltipText: getThemeToken('--wl-chart-tooltip-text', colors.textStrong, element),
  }
}

export function observeThemeChanges(callback: () => void, element: Element = document.documentElement): () => void {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-brand' || mutation.attributeName === 'class')) {
      callback()
    }
  })
  observer.observe(element, { attributes: true, attributeFilter: ['data-theme', 'data-brand', 'class'] })
  return () => observer.disconnect()
}

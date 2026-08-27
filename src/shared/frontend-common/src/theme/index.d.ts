export type ThemeName = 'light' | 'dark'

export const themeStorageKey: 'atlament.system.theme'
export const themeNames: {
  readonly light: 'light'
  readonly dark: 'dark'
}

export function normalizeTheme(value: unknown): ThemeName
export function readStoredTheme(storage?: Storage): ThemeName
export function writeStoredTheme(theme: ThemeName, storage?: Storage): ThemeName
export function applyTheme(theme: ThemeName, root?: Element): ThemeName
export function getCurrentTheme(root?: Element): ThemeName
export function toggleTheme(options?: {
  root?: Element
  storage?: Storage
}): ThemeName
export function initializeThemeToggle(options?: {
  trigger?: HTMLElement | null
  root?: Element
  storage?: Storage
}): {
  dispose(): void
}
export function initializeStoredTheme(options?: {
  root?: Element
  storage?: Storage
}): {
  dispose(): void
}

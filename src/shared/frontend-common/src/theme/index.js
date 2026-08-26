export const themeStorageKey = 'atlament.system.theme'

export const themeNames = {
  light: 'light',
  dark: 'dark',
}

export function normalizeTheme(value) {
  return value === themeNames.dark ? themeNames.dark : themeNames.light
}

export function readStoredTheme(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(themeStorageKey)
    return value === themeNames.dark || value === themeNames.light ? value : themeNames.light
  } catch {
    return themeNames.light
  }
}

export function writeStoredTheme(theme, storage = globalThis.localStorage) {
  const normalized = normalizeTheme(theme)
  try {
    storage?.setItem(themeStorageKey, normalized)
  } catch {
    // Storage can be unavailable in restricted browser contexts. The DOM theme still applies.
  }
  return normalized
}

export function applyTheme(theme, root = document.documentElement) {
  const normalized = normalizeTheme(theme)
  if (normalized === themeNames.dark) {
    root.setAttribute('data-theme', themeNames.dark)
  } else {
    root.removeAttribute('data-theme')
  }
  return normalized
}

export function getCurrentTheme(root = document.documentElement) {
  return root.getAttribute('data-theme') === themeNames.dark ? themeNames.dark : themeNames.light
}

export function initializeStoredTheme({
  root = document.documentElement,
  storage = globalThis.localStorage,
} = {}) {
  applyTheme(readStoredTheme(storage), root)

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-theme')) {
      writeStoredTheme(getCurrentTheme(root), storage)
    }
  })
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

  return {
    dispose() {
      observer.disconnect()
    },
  }
}

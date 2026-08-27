export const themeStorageKey = 'atlament.system.theme'

export const themeNames = {
  light: 'light',
  dark: 'dark',
}

export function normalizeTheme(value) {
  return value === themeNames.dark ? themeNames.dark : themeNames.light
}

function getThemeStorage(storage) {
  if (storage !== undefined) return storage
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function readStoredTheme(storage) {
  try {
    const value = getThemeStorage(storage)?.getItem(themeStorageKey)
    return value === themeNames.dark || value === themeNames.light ? value : themeNames.light
  } catch {
    return themeNames.light
  }
}

export function writeStoredTheme(theme, storage) {
  const normalized = normalizeTheme(theme)
  try {
    getThemeStorage(storage)?.setItem(themeStorageKey, normalized)
  } catch {
    // Storage can be unavailable in restricted browser contexts. The DOM theme still applies.
  }
  return normalized
}

export function applyTheme(theme, root = document.documentElement) {
  // Light mode is represented by the absence of data-theme so existing light CSS remains the
  // default and old pages do not need a migration class.
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

export function toggleTheme({
  root = document.documentElement,
  storage,
} = {}) {
  const nextTheme = getCurrentTheme(root) === themeNames.dark ? themeNames.light : themeNames.dark
  applyTheme(nextTheme, root)
  writeStoredTheme(nextTheme, storage)
  return nextTheme
}

export function initializeThemeToggle({
  trigger,
  root = document.documentElement,
  storage,
} = {}) {
  if (!trigger) {
    return { dispose() {} }
  }

  function syncState() {
    // The trigger is shared by desktop and drawer navigation; keeping state derived from the DOM
    // lets either control update correctly after the other toggles the root attribute.
    const currentTheme = getCurrentTheme(root)
    trigger.setAttribute('aria-pressed', String(currentTheme === themeNames.dark))
    trigger.setAttribute('aria-label', currentTheme === themeNames.dark ? 'Switch to light theme' : 'Switch to dark theme')
    trigger.dataset.theme = currentTheme
  }

  function handleClick() {
    toggleTheme({ root, storage })
    syncState()
  }

  const observer = new MutationObserver(syncState)
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  trigger.addEventListener('click', handleClick)
  syncState()

  return {
    dispose() {
      observer.disconnect()
      trigger.removeEventListener('click', handleClick)
    },
  }
}

export function initializeStoredTheme({
  root = document.documentElement,
  storage,
} = {}) {
  applyTheme(readStoredTheme(storage), root)

  // Persist external DOM changes too. Later UI affordances can change data-theme directly without
  // needing to know about storage.
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

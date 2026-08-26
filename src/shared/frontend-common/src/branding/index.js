export const logoVariantStorageKey = 'atlament.system.branding.logoVariant'

export const logoVariants = {
  primary: 'primary',
  secondary: 'secondary',
}

export const brandVariants = {
  green: 'green',
  violet: 'violet',
}

export const logoAssets = {
  primary: 'logo_svg_primary.svg',
  secondary: 'logo_svg_secondary.svg',
}

const brandVariantChangeEvent = 'atlament:brand-variant-change'

export function normalizeLogoVariant(value) {
  return value === logoVariants.secondary ? logoVariants.secondary : logoVariants.primary
}

function getBrandingStorage(storage) {
  if (storage !== undefined) return storage
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function normalizeBrandVariant(value) {
  if (value === brandVariants.violet || value === logoVariants.secondary) return brandVariants.violet
  return brandVariants.green
}

export function getBrandVariantForLogoVariant(variant) {
  return normalizeLogoVariant(variant) === logoVariants.secondary ? brandVariants.violet : brandVariants.green
}

export function getLogoVariantForBrandVariant(variant) {
  return normalizeBrandVariant(variant) === brandVariants.violet ? logoVariants.secondary : logoVariants.primary
}

export function readLogoVariant(storage) {
  try {
    return normalizeLogoVariant(getBrandingStorage(storage)?.getItem(logoVariantStorageKey))
  } catch {
    return logoVariants.primary
  }
}

export function readStoredBrandVariant(storage) {
  return getBrandVariantForLogoVariant(readLogoVariant(storage))
}

export function applyBrandVariant(variant, root = document.documentElement) {
  const normalized = normalizeBrandVariant(variant)
  root.setAttribute('data-brand', normalized)
  return normalized
}

export function writeLogoVariant(variant, storage) {
  const normalized = normalizeLogoVariant(variant)
  try {
    getBrandingStorage(storage)?.setItem(logoVariantStorageKey, normalized)
  } catch {
    // Storage can be unavailable in restricted browser contexts. The visual toggle still proceeds in memory.
  }
  return normalized
}

function dispatchBrandVariantChange(logoVariant) {
  globalThis.dispatchEvent?.(new CustomEvent(brandVariantChangeEvent, {
    detail: {
      logoVariant,
      brandVariant: getBrandVariantForLogoVariant(logoVariant),
    },
  }))
}

export function toggleLogoVariant(currentVariant, storage) {
  const next = normalizeLogoVariant(currentVariant) === logoVariants.primary
    ? logoVariants.secondary
    : logoVariants.primary
  const normalized = writeLogoVariant(next, storage)
  dispatchBrandVariantChange(normalized)
  return normalized
}

export function getLogoAssetPath(variant, basePath = './frontend-common/branding/assets/') {
  const filename = logoAssets[normalizeLogoVariant(variant)]
  return new URL(filename, new URL(basePath, globalThis.location?.href ?? 'http://localhost/')).pathname
}

export function initializeBrandingLogo({ image, trigger, basePath = './frontend-common/branding/assets/' }) {
  if (!image || !trigger) {
    return { dispose() {} }
  }

  let variant = readLogoVariant()

  function render() {
    image.src = getLogoAssetPath(variant, basePath)
    image.dataset.logoVariant = variant
    applyBrandVariant(getBrandVariantForLogoVariant(variant))
  }

  function handleClick() {
    variant = toggleLogoVariant(variant)
    render()
  }

  function handleBrandVariantChange(event) {
    variant = normalizeLogoVariant(event.detail?.logoVariant)
    render()
  }

  render()
  trigger.addEventListener('click', handleClick)
  globalThis.addEventListener?.(brandVariantChangeEvent, handleBrandVariantChange)

  return {
    dispose() {
      trigger.removeEventListener('click', handleClick)
      globalThis.removeEventListener?.(brandVariantChangeEvent, handleBrandVariantChange)
    },
  }
}

export function initializeStoredBrandVariant({
  root = document.documentElement,
  storage,
} = {}) {
  applyBrandVariant(readStoredBrandVariant(storage), root)

  return {
    dispose() {},
  }
}

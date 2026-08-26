export const logoVariantStorageKey = 'atlament.system.branding.logoVariant'

export const logoVariants = {
  primary: 'primary',
  secondary: 'secondary',
}

export const logoAssets = {
  primary: 'logo_svg_primary.svg',
  secondary: 'logo_svg_secondary.svg',
}

export function normalizeLogoVariant(value) {
  return value === logoVariants.secondary ? logoVariants.secondary : logoVariants.primary
}

export function readLogoVariant(storage = globalThis.localStorage) {
  try {
    return normalizeLogoVariant(storage?.getItem(logoVariantStorageKey))
  } catch {
    return logoVariants.primary
  }
}

export function writeLogoVariant(variant, storage = globalThis.localStorage) {
  const normalized = normalizeLogoVariant(variant)
  try {
    storage?.setItem(logoVariantStorageKey, normalized)
  } catch {
    // Storage can be unavailable in restricted browser contexts. The visual toggle still proceeds in memory.
  }
  return normalized
}

export function toggleLogoVariant(currentVariant, storage = globalThis.localStorage) {
  const next = normalizeLogoVariant(currentVariant) === logoVariants.primary
    ? logoVariants.secondary
    : logoVariants.primary
  return writeLogoVariant(next, storage)
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
  }

  function handleClick() {
    variant = toggleLogoVariant(variant)
    render()
  }

  render()
  trigger.addEventListener('click', handleClick)

  return {
    dispose() {
      trigger.removeEventListener('click', handleClick)
    },
  }
}

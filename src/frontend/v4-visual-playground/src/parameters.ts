export type PlaygroundMode = 'glass' | 'plasma' | 'composition'

export interface AmbientParameters {
  backgroundBrightness: number
  greenIntensity: number
  ambientGlow: number
  density: number
  spawnRate: number
  riseSpeed: number
  drift: number
  particleSize: number
  particleGlow: number
  particleOpacity: number
  lifetime: number
  fadeTiming: number
}

export interface GlassParameters {
  opacity: number
  blur: number
  saturation: number
  borderOpacity: number
  borderBrightness: number
  radius: number
  reflection: number
  glow: number
  shadow: number
}

export interface PlasmaParameters {
  size: number
  viscosity: number
  stretch: number
  blend: number
  flow: number
  tintOpacity: number
  frost: number
  refraction: number
  dispersion: number
  rim: number
  glow: number
  shimmerSpeed: number
}

export interface PlaygroundParameters {
  ambient: AmbientParameters
  glass: GlassParameters
  plasma: PlasmaParameters
}

export const defaultParameters: PlaygroundParameters = {
  ambient: {
    backgroundBrightness: 18,
    greenIntensity: 64,
    ambientGlow: 52,
    density: 26,
    spawnRate: 50,
    riseSpeed: 28,
    drift: 34,
    particleSize: 5,
    particleGlow: 62,
    particleOpacity: 58,
    lifetime: 24,
    fadeTiming: 72,
  },
  glass: {
    opacity: 14,
    blur: 24,
    saturation: 138,
    borderOpacity: 24,
    borderBrightness: 82,
    radius: 28,
    reflection: 62,
    glow: 34,
    shadow: 64,
  },
  plasma: {
    size: 100,
    viscosity: 0.42,
    stretch: 1.25,
    blend: 48,
    flow: 0.43,
    tintOpacity: 0,
    frost: 0.33,
    refraction: 1.2,
    dispersion: 0.65,
    rim: 0.75,
    glow: 0.6,
    shimmerSpeed: 0.7,
  },
}

export function isPlaygroundParameters(value: unknown): value is PlaygroundParameters {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PlaygroundParameters>
  return Object.entries(defaultParameters).every(([groupName, defaults]) => {
    const group = candidate[groupName as keyof PlaygroundParameters]
    return group && typeof group === 'object' && Object.keys(defaults).every(
      (key) => typeof (group as unknown as Record<string, unknown>)[key] === 'number',
    )
  })
}

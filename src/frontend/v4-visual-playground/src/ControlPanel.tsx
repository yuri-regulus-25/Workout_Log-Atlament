import type { Dispatch, SetStateAction } from 'react'
import type { PlaygroundMode, PlaygroundParameters } from './parameters'

type ParameterGroup = keyof PlaygroundParameters

interface RangeDefinition {
  key: string
  label: string
  min: number
  max: number
  step?: number
  unit?: string
}

const ranges: Record<ParameterGroup, RangeDefinition[]> = {
  ambient: [
    { key: 'backgroundBrightness', label: 'Background brightness', min: 0, max: 100, unit: '%' },
    { key: 'greenIntensity', label: 'Background green', min: 0, max: 100, unit: '%' },
    { key: 'ambientGlow', label: 'Ambient glow', min: 0, max: 100, unit: '%' },
    { key: 'density', label: 'Particle density', min: 0, max: 100, unit: '%' },
    { key: 'spawnRate', label: 'Spawn rate', min: 0, max: 100, unit: '%' },
    { key: 'riseSpeed', label: 'Rise speed', min: 0, max: 100, unit: '%' },
    { key: 'drift', label: 'Horizontal drift', min: 0, max: 120, unit: 'px' },
    { key: 'particleSize', label: 'Particle size', min: 1, max: 14, step: 0.5, unit: 'px' },
    { key: 'particleGlow', label: 'Particle glow', min: 0, max: 100, unit: '%' },
    { key: 'particleOpacity', label: 'Particle opacity', min: 0, max: 100, unit: '%' },
    { key: 'lifetime', label: 'Lifetime', min: 8, max: 48, unit: 's' },
    { key: 'fadeTiming', label: 'Fade timing', min: 30, max: 95, unit: '%' },
  ],
  glass: [
    { key: 'opacity', label: 'Surface opacity', min: 0, max: 60, unit: '%' },
    { key: 'blur', label: 'Blur', min: 0, max: 50, unit: 'px' },
    { key: 'saturation', label: 'Saturation', min: 50, max: 220, unit: '%' },
    { key: 'borderOpacity', label: 'Border opacity', min: 0, max: 100, unit: '%' },
    { key: 'borderBrightness', label: 'Border brightness', min: 20, max: 140, unit: '%' },
    { key: 'radius', label: 'Radius', min: 0, max: 56, unit: 'px' },
    { key: 'reflection', label: 'Reflection', min: 0, max: 100, unit: '%' },
    { key: 'glow', label: 'Glow', min: 0, max: 100, unit: '%' },
    { key: 'shadow', label: 'Shadow / depth', min: 0, max: 100, unit: '%' },
  ],
  plasma: [
    { key: 'size', label: 'Surface size', min: 70, max: 135, unit: '%' },
    { key: 'viscosity', label: 'Viscosity', min: 0, max: 1, step: 0.01 },
    { key: 'stretch', label: 'Stretch', min: 0, max: 2.5, step: 0.05 },
    { key: 'blend', label: 'Merge distance', min: 0, max: 96, unit: 'px' },
    { key: 'flow', label: 'Edge flow', min: 0, max: 1, step: 0.01 },
    { key: 'tintOpacity', label: 'Visual intensity', min: 0, max: 0.7, step: 0.01 },
    { key: 'frost', label: 'Frost', min: 0, max: 1, step: 0.01 },
    { key: 'refraction', label: 'Refraction', min: 0, max: 2.5, step: 0.05 },
    { key: 'dispersion', label: 'Dispersion', min: 0, max: 2.5, step: 0.05 },
    { key: 'rim', label: 'Rim', min: 0, max: 1.5, step: 0.05 },
    { key: 'glow', label: 'Glow', min: 0, max: 1.5, step: 0.05 },
    { key: 'shimmerSpeed', label: 'Motion speed', min: 0, max: 3, step: 0.05 },
  ],
}

interface ControlPanelProps {
  mode: PlaygroundMode
  parameters: PlaygroundParameters
  setParameters: Dispatch<SetStateAction<PlaygroundParameters>>
}

export function ControlPanel({ mode, parameters, setParameters }: ControlPanelProps) {
  const groups: ParameterGroup[] = mode === 'glass'
    ? ['ambient', 'glass']
    : mode === 'plasma'
      ? ['ambient', 'plasma']
      : ['ambient', 'glass', 'plasma']

  function setValue(group: ParameterGroup, key: string, value: number) {
    setParameters((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }))
  }

  return (
    <div className="control-groups">
      {groups.map((group) => (
        <fieldset className="control-group" key={group}>
          <legend>{group}</legend>
          {ranges[group].map((range) => {
            const value = parameters[group][range.key as keyof typeof parameters[typeof group]] as number
            return (
              <label className="range-control" key={range.key}>
                <span>{range.label}</span>
                <output>{value}{range.unit ?? ''}</output>
                <input
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={range.step ?? 1}
                  value={value}
                  onChange={(event) => setValue(group, range.key, Number(event.currentTarget.value))}
                />
              </label>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}

import { useState, type CSSProperties } from 'react'
import { Plasma, PlasmaCanvas, PlasmaProvider } from '@cruxgarden/plasma-ui'
import { AmbientParticles } from './AmbientParticles'
import type { PlaygroundParameters } from './parameters'

interface PlasmaSceneProps {
  parameters: PlaygroundParameters
  compact?: boolean
}

export function PlasmaScene({ parameters, compact = false }: PlasmaSceneProps) {
  const [joined, setJoined] = useState(false)
  const { ambient, plasma } = parameters
  const size = plasma.size / 100
  const variables = {
    '--bg-brightness': ambient.backgroundBrightness / 100,
    '--green-intensity': ambient.greenIntensity / 100,
    '--ambient-glow': ambient.ambientGlow / 100,
    '--plasma-scale': size,
  } as CSSProperties

  return (
    <section className={`scene plasma-scene ${compact ? 'scene--compact' : ''}`} style={variables} aria-label="Plasma playground canvas">
      <div className="ambient-field" />
      <AmbientParticles parameters={ambient} />
      <PlasmaProvider
        canvas={false}
        theme="dark"
        background="#07100c"
        tint="#10b981"
        opacity={plasma.tintOpacity}
        frost={plasma.frost}
        viscosity={plasma.viscosity}
        stretch={plasma.stretch}
        blend={plasma.blend}
        flow={plasma.flow}
        refraction={plasma.refraction}
        dispersion={plasma.dispersion}
        rim={plasma.rim}
        rimColor="tint"
        glow={plasma.glow}
        shimmerSpeed={plasma.shimmerSpeed}
        grain={0.12}
        maxSurfaces={compact ? 3 : 7}
      >
        <PlasmaCanvas className="plasma-canvas" zIndex={1} />
        <div className="plasma-stage">
          <Plasma
            draggable
            className="plasma-surface plasma-primary"
            padding={26}
            onJoinChange={setJoined}
          >
            <span className="sample-eyebrow">DRAG ME</span>
            <strong>Move<br />the surface</strong>
            <small>Approach · merge · pull · detach</small>
          </Plasma>
          <Plasma
            draggable
            className="plasma-surface plasma-secondary"
            padding={22}
            onJoinChange={setJoined}
          >
            <span className="plasma-glyph">+</span>
            <span>Liquid node</span>
          </Plasma>
          {!compact && <>
            <Plasma draggable className="plasma-surface plasma-orb" radius={999} aria-label="Small draggable plasma surface">
              <span>03</span>
            </Plasma>
            <Plasma className="plasma-surface plasma-dock" fuse={false} padding={16} lean={false}>
              <span>Fixed plasma dock</span>
              <button data-plasma-nodrag>Press</button>
            </Plasma>
          </>}
        </div>
        <div className={`join-indicator ${joined ? 'is-joined' : ''}`}>
          <i /> {joined ? 'Surfaces joined' : 'Surfaces separated'}
        </div>
      </PlasmaProvider>
      <span className="scene-caption">Drag surfaces together, then pull apart</span>
    </section>
  )
}

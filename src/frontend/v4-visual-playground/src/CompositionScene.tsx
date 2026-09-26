import type { CSSProperties } from 'react'
import { Plasma, PlasmaCanvas, PlasmaProvider } from '@cruxgarden/plasma-ui'
import { AmbientParticles } from './AmbientParticles'
import type { PlaygroundParameters } from './parameters'

export function CompositionScene({ parameters }: { parameters: PlaygroundParameters }) {
  const { ambient, glass, plasma } = parameters
  const variables = {
    '--bg-brightness': ambient.backgroundBrightness / 100,
    '--green-intensity': ambient.greenIntensity / 100,
    '--ambient-glow': ambient.ambientGlow / 100,
    '--glass-opacity': glass.opacity / 100,
    '--glass-blur': `${glass.blur}px`,
    '--glass-saturation': `${glass.saturation}%`,
    '--glass-border-opacity': glass.borderOpacity / 100,
    '--glass-border-brightness': `${glass.borderBrightness}%`,
    '--glass-radius': `${glass.radius}px`,
    '--glass-reflection': glass.reflection / 100,
    '--glass-glow': glass.glow / 100,
    '--glass-shadow': glass.shadow / 100,
  } as CSSProperties

  return (
    <section className="scene composition-scene" style={variables} aria-label="Composition preview canvas">
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
        grain={0.08}
        maxSurfaces={4}
      >
        <PlasmaCanvas className="plasma-canvas" zIndex={1} />
        <div className="composition-layout">
          <div className="composition-copy">
            <span className="sample-eyebrow">COMPOSITION CHECK</span>
            <h2>Enough atmosphere.<br />Still enough quiet.</h2>
          </div>
          <article className="glass-surface composition-card">
            <span>Stable material</span>
            <strong>Glass carries information.</strong>
            <p>Particles remain environmental and never compete with content.</p>
          </article>
          <Plasma draggable className="plasma-surface composition-plasma-a" padding={24}>
            <strong>Interactive</strong><small>Drag to test the balance</small>
          </Plasma>
          <Plasma draggable className="plasma-surface composition-plasma-b" radius={999}>
            <span>+</span>
          </Plasma>
        </div>
      </PlasmaProvider>
      <span className="scene-caption">Glass + Plasma + Particle · noise balance preview</span>
    </section>
  )
}

import type { CSSProperties } from 'react'
import { AmbientParticles } from './AmbientParticles'
import type { PlaygroundParameters } from './parameters'

interface GlassSceneProps {
  parameters: PlaygroundParameters
  compact?: boolean
}

export function GlassScene({ parameters, compact = false }: GlassSceneProps) {
  const { ambient, glass } = parameters
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
    <section className={`scene glass-scene ${compact ? 'scene--compact' : ''}`} style={variables} aria-label="Glass playground canvas">
      <div className="ambient-field" />
      <AmbientParticles parameters={ambient} />
      <div className="scene-grid glass-samples">
        <article className="glass-surface glass-large">
          <div className="sample-eyebrow">STABLE SURFACE · 01</div>
          <h2>Quiet depth,<br />held in place.</h2>
          <p>Particle diffusion, reflection, and text contrast should remain legible without flattening the atmosphere.</p>
          <div className="sample-progress"><span /></div>
        </article>
        {!compact && <>
          <article className="glass-surface glass-medium">
            <div className="sample-icon">↗</div>
            <span className="sample-label">Ambient activity</span>
            <strong>62%</strong>
          </article>
          <nav className="glass-surface glass-navigation" aria-label="Material sample navigation">
            <button className="nav-dot is-active" aria-label="First sample" />
            <button className="nav-dot" aria-label="Second sample" />
            <button className="nav-dot" aria-label="Third sample" />
            <span className="nav-spacer" />
            <button className="nav-action">Adjust</button>
          </nav>
          <article className="glass-surface glass-small">
            <span className="status-light" />
            <span>Atmosphere stable</span>
          </article>
          <button className="glass-surface glass-button">Focus material</button>
          <span className="glass-surface glass-chip">LIVE · GLASS</span>
        </>}
      </div>
      <span className="scene-caption">Particle passes behind every glass surface</span>
    </section>
  )
}

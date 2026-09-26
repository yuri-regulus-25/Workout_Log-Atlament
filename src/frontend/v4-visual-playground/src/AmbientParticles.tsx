import { useMemo, type CSSProperties } from 'react'
import type { AmbientParameters } from './parameters'

interface AmbientParticlesProps {
  parameters: AmbientParameters
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export function AmbientParticles({ parameters }: AmbientParticlesProps) {
  const particles = useMemo(
    () => Array.from({ length: 72 }, (_, index) => ({
      id: index,
      left: 2 + pseudoRandom(index + 1) * 96,
      bottom: -2 + pseudoRandom(index + 13) * 34,
      scale: 0.55 + pseudoRandom(index + 29) * 0.9,
      delay: pseudoRandom(index + 47),
      drift: pseudoRandom(index + 61) * 2 - 1,
    })),
    [],
  )

  const visibleCount = Math.round((parameters.density / 100) * particles.length)
  const duration = Math.max(8, parameters.lifetime * (1.45 - parameters.riseSpeed / 200))

  return (
    <div className="ambient-particles" aria-hidden="true">
      {particles.slice(0, visibleCount).map((particle) => ({
        ...particle,
        delay: particle.delay * duration * (1.5 - parameters.spawnRate / 100),
      })).map((particle) => (
        <i
          className="ambient-particle"
          key={particle.id}
          style={{
            '--particle-left': `${particle.left}%`,
            '--particle-bottom': `${particle.bottom}%`,
            '--particle-size': `${parameters.particleSize * particle.scale}px`,
            '--particle-opacity': parameters.particleOpacity / 100,
            '--particle-glow': `${3 + parameters.particleGlow / 5}px`,
            '--particle-duration': `${duration}s`,
            '--particle-delay': `${-particle.delay}s`,
            '--particle-drift': `${particle.drift * parameters.drift}px`,
            '--particle-mid-opacity': (parameters.fadeTiming / 100) * (parameters.particleOpacity / 100),
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

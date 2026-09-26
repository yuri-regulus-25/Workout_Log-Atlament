import { useEffect, useMemo, useState } from 'react'
import type { Engine, ISourceOptions } from '@tsparticles/engine'
import Particles, { ParticlesProvider } from '@tsparticles/react'
import { loadFull } from 'tsparticles'
import type { AmbientParameters } from './parameters'

interface AmbientParticlesProps {
  parameters: AmbientParameters
}

const initializeParticles = async (engine: Engine) => {
  await loadFull(engine)
}

export function AmbientParticles({ parameters }: AmbientParticlesProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motionQuery.matches)
    updateMotion()
    motionQuery.addEventListener('change', updateMotion)

    return () => {
      motionQuery.removeEventListener('change', updateMotion)
    }
  }, [])

  const options = useMemo<ISourceOptions>(() => {
    const opacity = parameters.particleOpacity / 100
    const speed = Math.max(0.2, parameters.riseSpeed / 24)
    const driftAngle = Math.min(35, parameters.drift / 3.4)
    const emissionDelay = Math.max(0.08, 1.15 - parameters.spawnRate / 100)
    const emissionQuantity = Math.max(1, Math.round(parameters.density / 22))

    return {
      autoPlay: !reducedMotion,
      clear: true,
      detectRetina: true,
      fpsLimit: 60,
      fullScreen: { enable: false },
      pauseOnBlur: true,
      pauseOnOutsideViewport: true,
      particles: {
        color: { value: ['#67f5b3', '#2ddb8a', '#b7ffdb'] },
        life: {
          count: 1,
          duration: { value: parameters.lifetime, sync: false },
        },
        move: {
          angle: { offset: driftAngle, value: 90 },
          direction: 'top',
          enable: !reducedMotion,
          outModes: { default: 'destroy', top: 'destroy' },
          random: true,
          speed: { min: speed * 0.55, max: speed * 1.2 },
          straight: false,
        },
        number: { value: 0 },
        opacity: {
          value: { min: opacity * 0.35, max: opacity },
          animation: {
            count: 1,
            destroy: 'min',
            enable: true,
            speed: Math.max(
              0.01,
              opacity / Math.max(2, parameters.lifetime * (parameters.fadeTiming / 100)),
            ),
            startValue: 'max',
            sync: false,
          },
        },
        shadow: {
          blur: 4 + parameters.particleGlow / 4,
          color: { value: '#2ee891' },
          enable: parameters.particleGlow > 0,
          offset: { x: 0, y: 0 },
        },
        shape: { type: 'circle' },
        size: {
          value: {
            min: Math.max(0.8, parameters.particleSize * 0.45),
            max: parameters.particleSize * 1.35,
          },
        },
      },
      emitters: {
        direction: 'top',
        life: { count: 0 },
        position: { x: 50, y: 101 },
        rate: { delay: emissionDelay, quantity: emissionQuantity },
        size: { height: 2, mode: 'percent', width: 100 },
        startCount: Math.round(parameters.density * 0.65),
      },
    }
  }, [parameters, reducedMotion])

  return (
    <ParticlesProvider init={initializeParticles}>
      <Particles
        className="ambient-particles"
        id="atlament-ambient-particles"
        options={options}
      />
    </ParticlesProvider>
  )
}

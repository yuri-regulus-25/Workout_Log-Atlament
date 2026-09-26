import { useState } from 'react'
import { CompositionScene } from './CompositionScene'
import { ControlPanel } from './ControlPanel'
import { GlassScene } from './GlassScene'
import { PlasmaScene } from './PlasmaScene'
import { PresetPanel } from './PresetPanel'
import { defaultParameters, type PlaygroundMode, type PlaygroundParameters } from './parameters'

const modes: Array<{ id: PlaygroundMode; index: string; name: string; description: string }> = [
  { id: 'glass', index: 'A', name: 'Glass', description: 'Stable surface & diffusion' },
  { id: 'plasma', index: 'B', name: 'Plasma', description: 'Liquid movement & merge' },
  { id: 'composition', index: 'C', name: 'Composition', description: 'All materials together' },
]

export default function App() {
  const [mode, setMode] = useState<PlaygroundMode>('glass')
  const [parameters, setParameters] = useState<PlaygroundParameters>(() => structuredClone(defaultParameters))
  const [controlsOpen, setControlsOpen] = useState(true)

  return (
    <main className={`playground-shell mode-${mode}`}>
      <header className="topbar">
        <div className="wordmark"><i /><span>ATLAMENT</span><small>v4 visual study</small></div>
        <nav className="mode-tabs" aria-label="Playground selection">
          {modes.map((item) => (
            <button className={mode === item.id ? 'is-active' : ''} onClick={() => setMode(item.id)} key={item.id}>
              <span>{item.index}</span><strong>{item.name}</strong><small>{item.description}</small>
            </button>
          ))}
        </nav>
        <button className="control-toggle" onClick={() => setControlsOpen((open) => !open)} aria-expanded={controlsOpen}>
          {controlsOpen ? 'Hide controls' : 'Show controls'}
        </button>
      </header>

      <div className={`workspace ${controlsOpen ? '' : 'workspace--wide'}`}>
        <div className="canvas-column">
          {mode === 'glass' && <GlassScene parameters={parameters} />}
          {mode === 'plasma' && <PlasmaScene parameters={parameters} />}
          {mode === 'composition' && <CompositionScene parameters={parameters} />}
          <footer className="canvas-footer">
            <span>Dark only · Primary green #10b981</span>
            <span>Move slowly. Observe carefully.</span>
          </footer>
        </div>

        {controlsOpen && (
          <aside className="control-panel">
            <div className="panel-heading">
              <span className="panel-kicker">REAL-TIME PARAMETERS</span>
              <h2>{modes.find((item) => item.id === mode)?.name} controls</h2>
              <p>値は即時反映されます。正解を決めず、触って比較してください。</p>
            </div>
            <ControlPanel mode={mode} parameters={parameters} setParameters={setParameters} />
            <PresetPanel parameters={parameters} setParameters={setParameters} />
          </aside>
        )}
      </div>
    </main>
  )
}

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { defaultParameters, isPlaygroundParameters, type PlaygroundParameters } from './parameters'

const storageKey = 'atlament-v4-visual-presets'

interface SavedPreset {
  name: string
  parameters: PlaygroundParameters
}

interface PresetPanelProps {
  parameters: PlaygroundParameters
  setParameters: Dispatch<SetStateAction<PlaygroundParameters>>
}

function readPresets(): SavedPreset[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as unknown
    return Array.isArray(value) ? value.filter((item): item is SavedPreset => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<SavedPreset>
      return typeof candidate.name === 'string' && isPlaygroundParameters(candidate.parameters)
    }) : []
  } catch {
    return []
  }
}

export function PresetPanel({ parameters, setParameters }: PresetPanelProps) {
  const [json, setJson] = useState(() => JSON.stringify(parameters, null, 2))
  const [presetName, setPresetName] = useState('Quiet green')
  const [presets, setPresets] = useState<SavedPreset[]>(readPresets)
  const [message, setMessage] = useState('')

  useEffect(() => setJson(JSON.stringify(parameters, null, 2)), [parameters])

  function restoreJson() {
    try {
      const parsed: unknown = JSON.parse(json)
      if (!isPlaygroundParameters(parsed)) throw new Error('invalid shape')
      setParameters(parsed)
      setMessage('JSON を復元しました')
    } catch {
      setMessage('JSON の形式が正しくありません')
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(parameters, null, 2))
      setMessage('JSON をコピーしました')
    } catch {
      setMessage('Clipboard を利用できません')
    }
  }

  function savePreset() {
    const name = presetName.trim()
    if (!name) return
    const next = [...presets.filter((preset) => preset.name !== name), { name, parameters }]
    setPresets(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
    setMessage(`Preset「${name}」を保存しました`)
  }

  return (
    <section className="preset-panel">
      <div className="preset-heading">
        <div><span className="panel-kicker">REPRODUCIBLE STATE</span><h3>Preset & JSON</h3></div>
        <button className="text-button" onClick={() => setParameters(structuredClone(defaultParameters))}>Reset default</button>
      </div>
      <div className="preset-save-row">
        <input value={presetName} onChange={(event) => setPresetName(event.currentTarget.value)} aria-label="Preset name" />
        <button onClick={savePreset}>Save locally</button>
      </div>
      {presets.length > 0 && (
        <div className="saved-presets">
          {presets.map((preset) => (
            <button key={preset.name} onClick={() => setParameters(structuredClone(preset.parameters))}>{preset.name}</button>
          ))}
        </div>
      )}
      <textarea value={json} onChange={(event) => setJson(event.currentTarget.value)} spellCheck={false} aria-label="Current parameters as JSON" />
      <div className="preset-actions">
        <button onClick={copyJson}>Copy JSON</button>
        <button onClick={restoreJson}>Restore JSON</button>
        <span role="status">{message}</span>
      </div>
    </section>
  )
}

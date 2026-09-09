import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Settings composition contract', () => {
  it('keeps setup and status presentation in Solid components while App owns operations', () => {
    const app = readFileSync('src/frontend/settings-solid/src/App.tsx', 'utf8')
    const setup = readFileSync('src/frontend/settings-solid/src/SettingsSetupAssistant.tsx', 'utf8')
    const status = readFileSync('src/frontend/settings-solid/src/SettingsStatusSection.tsx', 'utf8')

    expect(app).toContain('<SettingsSetupAssistant')
    expect(app).toContain('<SettingsStatusSection')
    expect(app).toContain('onClick={saveRepository}')
    expect(app).toContain('onClick={saveCredential}')
    expect(app).toContain('onClick={saveResources}')
    expect(app).toContain('onClick={syncNow}')
    expect(app).not.toContain('function SetupAssistant')
    expect(app).not.toContain('function StatusSection')
    expect(setup).toContain('isSetupReady')
    expect(setup).toContain('requiredActionLabel')
    expect(status).toContain('runtimeDataSummary')
    expect(status).toContain('resolveGithubStatus')
    expect(status).toContain('Application Framework Version')
  })
})

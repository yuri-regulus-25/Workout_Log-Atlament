export async function getAfStatus() {
  const response = await fetch('/api/v1/common/status', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`AF status request failed: HTTP ${response.status}`)
  }

  return response.json()
}

export function deriveApplicationReadiness(status) {
  const requiredActions = Array.from(new Set(status?.requiredActions ?? [])).sort()
  const unavailableComponents = [
    status?.components?.configuration === 'unavailable' ? 'configuration' : '',
    status?.components?.credential === 'unavailable' ? 'credential' : '',
    status?.components?.runtimeData === 'unavailable' ? 'runtimeData' : '',
  ].filter(Boolean)
  const degradedComponents = [
    status?.components?.github === 'degraded' ? 'github' : '',
    status?.components?.runtimeData === 'degraded' ? 'runtimeData' : '',
  ].filter(Boolean)

  if (requiredActions.includes('CONFIGURATION_REQUIRED') || requiredActions.includes('CREDENTIAL_REQUIRED')) {
    return { state: 'unconfigured', requiredActions, unavailableComponents, degradedComponents }
  }

  if (!status?.application?.acceptingRequests || status?.application?.status === 'failed' || unavailableComponents.includes('runtimeData')) {
    return { state: 'unavailable', requiredActions, unavailableComponents, degradedComponents }
  }

  if (status?.application?.status === 'degraded' || degradedComponents.length > 0 || requiredActions.length > 0) {
    return { state: 'degraded', requiredActions, unavailableComponents, degradedComponents }
  }

  return { state: 'ready', requiredActions, unavailableComponents: [], degradedComponents: [] }
}

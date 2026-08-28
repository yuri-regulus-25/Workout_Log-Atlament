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

  if (status?.application?.status === 'degraded' || degradedComponents.length > 0 || unavailableComponents.length > 0 || requiredActions.length > 0) {
    return { state: 'degraded', requiredActions, unavailableComponents, degradedComponents }
  }

  return { state: 'ready', requiredActions, unavailableComponents: [], degradedComponents: [] }
}

export function deriveApplicationAccessPolicy(readiness, runtimeData) {
  const restrictedComponents = Array.from(new Set([
    ...(readiness?.unavailableComponents ?? []),
    ...(readiness?.degradedComponents ?? []),
  ])).sort()
  const fallbackActive = runtimeData?.fallbackActive ?? (
    readiness?.state === 'degraded' &&
    (readiness?.degradedComponents ?? []).includes('github') &&
    !(readiness?.unavailableComponents ?? []).includes('runtimeData')
  )

  if (readiness?.state === 'unconfigured') {
    return {
      state: 'unconfigured',
      normalApplicationsAvailable: false,
      settingsAvailable: true,
      setupAvailable: true,
      recoveryActions: ['open-settings', 'complete-setup'],
      restrictedComponents,
      fallbackActive: false,
    }
  }

  if (readiness?.state === 'unavailable') {
    return {
      state: 'unavailable',
      normalApplicationsAvailable: false,
      settingsAvailable: true,
      setupAvailable: false,
      recoveryActions: recoveryActionsFor(readiness),
      restrictedComponents,
      fallbackActive: false,
    }
  }

  if (readiness?.state === 'degraded') {
    return {
      state: 'degraded',
      normalApplicationsAvailable: true,
      settingsAvailable: true,
      setupAvailable: false,
      recoveryActions: recoveryActionsFor(readiness),
      restrictedComponents,
      fallbackActive,
    }
  }

  return {
    state: 'ready',
    normalApplicationsAvailable: true,
    settingsAvailable: true,
    setupAvailable: false,
    recoveryActions: [],
    restrictedComponents: [],
    fallbackActive: false,
  }
}

function recoveryActionsFor(readiness) {
  const actions = []
  if ((readiness?.requiredActions ?? []).includes('RUNTIME_DATA_REQUIRED') || (readiness?.unavailableComponents ?? []).includes('runtimeData')) {
    actions.push('retry-sync')
  }
  if ((readiness?.unavailableComponents ?? []).includes('credential')) {
    actions.push('update-credential')
  }
  if ((readiness?.degradedComponents ?? []).includes('github')) {
    actions.push('retry-sync')
  }
  actions.push('open-settings', 'reload')
  return Array.from(new Set(actions))
}

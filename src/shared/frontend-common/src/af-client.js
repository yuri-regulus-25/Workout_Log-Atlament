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

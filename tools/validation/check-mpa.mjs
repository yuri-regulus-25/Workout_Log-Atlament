import { spawn } from 'node:child_process'

const port = Number(process.env.MPA_CHECK_PORT ?? 4183)
const origin = `http://127.0.0.1:${port}`

const pages = [
  '/',
  '/dashboard/',
  '/workouts/',
  '/workouts/2026-08-14',
  '/machines/pec-deck',
  '/analytics/',
  '/settings/',
  '/maintenance/',
]

const notFoundPages = [
  '/unknown',
  '/dashboard/2026-08-14',
  '/analytics/detail',
  '/settings/repository',
  '/maintenance/detail',
]

const server = spawn(process.execPath, ['tools/dev-runtime/preview-mpa.mjs'], {
  env: {
    ...process.env,
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

try {
  await waitForServer()

  for (const page of pages) {
    const pageUrl = `${origin}${page}`
    const response = await fetchOk(pageUrl, 'text/html')
    const html = await response.text()

    for (const assetUrl of collectAssetUrls(pageUrl, html)) {
      await fetchOk(assetUrl)
    }

    console.log(`OK ${page}`)
  }

  for (const notFoundPage of notFoundPages) {
    await fetchStatus(`${origin}${notFoundPage}`, 404, 'text/html')
    console.log(`OK ${notFoundPage} 404`)
  }

  console.log(`MPA smoke check passed: ${pages.length} pages + ${notFoundPages.length} 404s`)
} finally {
  server.kill()
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`preview server exited early:\n${serverOutput}`)
    }

    try {
      const response = await fetch(`${origin}/`)
      if (response.ok) {
        return
      }
    } catch {
      // retry
    }

    await delay(100)
  }

  throw new Error(`preview server did not start:\n${serverOutput}`)
}

async function fetchOk(url, expectedContentType) {
  return fetchStatus(url, 200, expectedContentType)
}

async function fetchStatus(url, expectedStatus, expectedContentType) {
  const response = await fetch(url)

  if (response.status !== expectedStatus) {
    throw new Error(`${url} returned ${response.status}, expected ${expectedStatus}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (expectedContentType && !contentType.includes(expectedContentType)) {
    throw new Error(`${url} returned unexpected content-type: ${contentType}`)
  }

  return response
}

function collectAssetUrls(pageUrl, html) {
  const baseHref = html.match(/<base\s+href="([^"]+)"/)?.[1]
  const baseUrl = baseHref ? new URL(baseHref, origin) : new URL(pageUrl)
  const assets = new Set()
  const assetPattern = /(?:src|href)="([^"]+\.(?:css|ico|js|svg))"/g

  for (const match of html.matchAll(assetPattern)) {
    assets.add(new URL(match[1], baseUrl).toString())
  }

  return assets
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

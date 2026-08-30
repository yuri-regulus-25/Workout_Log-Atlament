import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hostedApplications, resolveApplicationSource } from '../application-registry.mjs'

const root = dirname(fileURLToPath(new URL('../../package.json', import.meta.url)))
const distRoot = join(root, 'dist')
const portalSource = join(root, 'src/frontend/portal/dist')
const errorSource = join(root, 'src/frontend/errors/dist')
const versionSource = join(root, 'src/version.json')

// The framework-specific builds produce their own dist folders. This script is the single MPA
// assembly step that gives Windows and Android one stable artifact layout to host.
await rm(distRoot, { recursive: true, force: true })
await mkdir(distRoot, { recursive: true })
await cp(portalSource, distRoot, { recursive: true })
await cp(errorSource, distRoot, { recursive: true })
await cp(versionSource, join(distRoot, 'version.json'))

for (const app of hostedApplications) {
  // Each app keeps its own build tooling and base href; only the finished static assets are copied.
  await cp(resolveApplicationSource(root, app), join(distRoot, app.distPath), { recursive: true })
}

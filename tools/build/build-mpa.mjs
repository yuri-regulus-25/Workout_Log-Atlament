import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(new URL('../../package.json', import.meta.url)))
const distRoot = join(root, 'dist')
const portalSource = join(root, 'src/frontend/portal/dist')
const errorSource = join(root, 'src/frontend/errors/dist')

const apps = [
  {
    path: 'dashboard',
    source: join(root, 'src/frontend/dashboard-react/dist'),
  },
  {
    path: 'workouts',
    source: join(root, 'src/frontend/workouts-vue/dist'),
  },
  {
    path: 'exercises',
    source: join(root, 'src/frontend/exercises-angular/dist/exercises-angular/browser'),
  },
  {
    path: 'analytics',
    source: join(root, 'src/frontend/analytics-svelte/dist'),
  },
  {
    path: 'settings',
    source: join(root, 'src/frontend/settings-solid/dist'),
  },
]

await rm(distRoot, { recursive: true, force: true })
await mkdir(distRoot, { recursive: true })
await cp(portalSource, distRoot, { recursive: true })
await cp(errorSource, distRoot, { recursive: true })

for (const app of apps) {
  await cp(app.source, join(distRoot, app.path), { recursive: true })
}

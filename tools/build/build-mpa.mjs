import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mdiChevronDoubleLeft, mdiChevronDoubleRight } from '@mdi/js'

const root = dirname(fileURLToPath(new URL('../../package.json', import.meta.url)))
const distRoot = join(root, 'dist')
const portalSource = join(root, 'src/frontend/portal/dist')

const apps = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    category: 'Overview',
    pointer: '今のトレーニングを知る',
    framework: 'React',
    source: join(root, 'src/frontend/dashboard-react/dist'),
  },
  {
    path: 'workouts',
    label: 'Workout History',
    category: 'History',
    pointer: 'これまでの記録を辿る',
    framework: 'Vue.js',
    source: join(root, 'src/frontend/workouts-vue/dist'),
  },
  {
    path: 'exercises',
    label: 'Performance Detail',
    category: 'Movement',
    pointer: '種目ごとの変化を追う',
    framework: 'Angular',
    source: join(root, 'src/frontend/exercises-angular/dist/exercises-angular/browser'),
  },
  {
    path: 'analytics',
    label: 'Analytics',
    category: 'Insights',
    pointer: 'データから傾向を見つける',
    framework: 'Svelte',
    source: join(root, 'src/frontend/analytics-svelte/dist'),
  },
  {
    path: 'settings',
    label: 'Application Settings',
    category: 'Configuration',
    pointer: '外の世界との繋がりを定める',
    framework: 'SolidJS',
    source: join(root, 'src/frontend/settings-solid/dist'),
  },
]

await rm(distRoot, { recursive: true, force: true })
await mkdir(distRoot, { recursive: true })
await cp(portalSource, distRoot, { recursive: true })

for (const app of apps) {
  await cp(app.source, join(distRoot, app.path), { recursive: true })
}

await writeFile(join(distRoot, '404.html'), createNotFoundHtml(apps), 'utf8')

function createNotFoundHtml(entries) {
  const links = entries
    .map(
      (entry) => `
        <a href="/${entry.path}/">
          <span>Go to ${entry.label}</span>
          <svg
            class="nav-link-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="${mdiChevronDoubleRight}" />
          </svg>
        </a>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>??? — Atlament</title>
    <style>
      :root {
        color: #172033;
        background: #f4f6fb;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; }
      main {
        width: min(760px, calc(100% - 32px));
        margin: 0 auto;
        padding: 72px 0;
      }
      .eyebrow {
        color: #7c3aed;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      h1 {
        color: #111827;
        font-size: clamp(2.75rem, 8vw, 5.5rem);
        line-height: 0.95;
        letter-spacing: -0.06em;
        margin: 8px 0 16px;
      }
      p {
        color: #64748b;
        font-size: 1.05rem;
        line-height: 1.7;
        margin: 0;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 28px;
      }
      nav a {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid #7c3aed;
        border-radius: 999px;
        background: transparent;
        color: #7c3aed;
        font-weight: 700;
        padding: 10px 14px;
        text-decoration: none;
        transition:
          background 180ms ease,
          color 180ms ease;
      }

      nav a:hover {
        background: #7c3aed;
        color: #fff;
      }

      .nav-link-icon {
        display: block;
        width: 18px;
        height: 18px;
        fill: currentColor;
        flex: 0 0 auto;
      }
      .portal-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #7c3aed;
        font-weight: 700;
        text-decoration: none;
        margin-top: 8px;

      }
      .portal-link-icon {
        display: block;
        width: 22px;
        height: 22px;
        fill: currentColor;
        flex: 0 0 auto;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Atlament / ?</p>
      <h2>Page not found</h2>
      <h1>Oops!</h1>
      <p>アクセスしようとしたら、存在しないところに来てしまいました。さて、どこへ戻ろうか?</p>
      <a class="portal-link" href="/">
        <svg
          class="portal-link-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="${mdiChevronDoubleLeft}" />
        </svg>Back to Portal
      </a>
      <nav aria-label="Back to applications">
        ${links}
      </nav>
    </main>
  </body>
</html>
`
}

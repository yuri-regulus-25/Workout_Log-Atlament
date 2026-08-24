import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mdiChevronDoubleLeft, mdiChevronDoubleRight } from '@mdi/js'

const root = dirname(fileURLToPath(new URL('../../package.json', import.meta.url)))
const distRoot = join(root, 'dist')

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

for (const app of apps) {
  await cp(app.source, join(distRoot, app.path), { recursive: true })
}

await writeFile(join(distRoot, 'index.html'), createIndexHtml(apps), 'utf8')
await writeFile(join(distRoot, '404.html'), createNotFoundHtml(apps), 'utf8')

function createIndexHtml(entries) {
  const links = entries
    .map(
      (entry) => `
        <a class="app-card" href="/${entry.path}/">
          <span class="app-category">${entry.category}</span>
          <strong class="app-title">${entry.label}</strong>
          <span class="app-pointer">${entry.pointer}</span>
          <small class="framework-badge">
            <span class="framework-label">Built with</span>
            <span class="framework-stack">
              <img
                src="/${entry.path}/favicon.svg"
                alt=""
                class="framework-icon"
              />
              <span>${entry.framework}</span>
            </span>
          </small>
        </a>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portal — Atlament</title>
    <style>
      :root {
        color: #172033;
        background: #f4f6fb;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; }
      main {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0;
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
        max-width: 720px;
        color: #64748b;
        font-size: 1.05rem;
        line-height: 1.7;
        margin: 0;
      }
      .app-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 16px;
        margin-top: 32px;
      }
      .sync-notice {
        display: none;
        align-items: center;
        gap: 12px;
        margin-top: 24px;
        border: 1px solid #ddd6fe;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.92);
        color: #4338ca;
        padding: 14px 16px;
        font-weight: 800;
        box-shadow: 0 16px 44px rgba(15, 23, 42, 0.08);
      }
      .sync-notice.visible {
        display: flex;
      }
      .sync-notice.warning {
        border-color: #fed7aa;
        color: #9a3412;
      }
      .sync-loader {
        width: 22px;
        height: 22px;
        border: 3px solid rgba(124, 58, 237, 0.22);
        border-top-color: #7c3aed;
        border-radius: 50%;
        animation: portal-spin 0.9s linear infinite;
        flex: 0 0 auto;
      }
      .sync-notice.warning .sync-loader {
        display: none;
      }
      .sync-notice a {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      @keyframes portal-spin {
        to { transform: rotate(360deg); }
      }
      .app-card {
        grid-column: span 2;
        display: grid;
        gap: 8px;
        min-height: 180px;
        align-content: space-between;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        color: #111827;
        padding: 22px;
        text-decoration: none;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
        transform: translateY(0);
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease;
      }

      .app-card:nth-child(1) {
        grid-column: 2 / span 2;
      }

      .app-card:nth-child(2) {
        grid-column: 4 / span 2;
      }

      .app-card:nth-child(n + 3) {
        grid-column: span 2;
      }

      .app-card:hover {
        transform: translateY(-4px);
        border-color: rgba(124, 58, 237, 0.25);
        box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14);
      }

      .app-pointer {
        opacity: 0;
        visibility: hidden;
        transform: translateY(6px);
        transition:
          opacity 180ms ease,
          transform 180ms ease,
          visibility 0s linear 180ms;
      }

      .app-card:hover .app-pointer {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        transition-delay: 0s;
      }
      .app-category,
      .app-pointer,
      .framework-badge {
        color: #64748b;
      }
      .app-title {
        color: #111827;
        font-size: 1.35rem;
        line-height: 1.18;
      }

      @media (max-width: 980px) {
        .app-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .app-card,
        .app-card:nth-child(1),
        .app-card:nth-child(2),
        .app-card:nth-child(n + 3) {
          grid-column: auto;
        }

        .app-card:last-child {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 640px) {
        .app-grid {
          grid-template-columns: 1fr;
        }

        .app-card:last-child {
          grid-column: auto;
        }
      }

      .framework-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 0.8rem;
        font-weight: 700;
        line-height: 1;
      }
      .framework-label {
        color: #94a3b8;
      }
      .framework-stack {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        line-height: 1;
      }
      .framework-icon {
        display: block;
        width: 22px;
        height: 22px;
        flex: 0 0 auto;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Atlament / Portal</p>
      <h2>Browse, Explore, Analyze.</h2>
      <h1>What do you want to explore?</h1>
      <p>
        ワークアウトの履歴、種目ごとの記録、蓄積したデータの分析へ。
      </p>
      <section id="sync-notice" class="sync-notice" aria-live="polite">
        <span class="sync-loader" aria-hidden="true"></span>
        <span id="sync-notice-text">同期データを取得しています。</span>
      </section>
      <section class="app-grid" aria-label="Applications">
        ${links}
      </section>
    </main>
    <script>
      const notice = document.getElementById('sync-notice')
      const noticeText = document.getElementById('sync-notice-text')
      let statusTimer = null

      async function refreshStatusNotice() {
        try {
          const response = await fetch('/api/v1/common/status', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          })

          if (!response.ok) {
            hideStatusNotice()
            return
          }

          const payload = await response.json()
          const status = payload.data
          const startupRunning = status?.operations?.startup === 'running'
          const manualSyncRunning = status?.operations?.manualSync === 'running'
          const runtimeRequired = Array.isArray(status?.requiredActions)
            && status.requiredActions.includes('RUNTIME_DATA_REQUIRED')

          notice.classList.remove('warning')
          if (startupRunning) {
            showStatusNotice('同期データを取得しています。', false)
          } else if (manualSyncRunning) {
            showStatusNotice('リモートデータを同期しています。', false)
          } else if (runtimeRequired) {
            showStatusNotice('同期済みデータがありません。<a href="/settings/">Application Settings</a>で設定と同期を確認してください。', true)
          } else {
            hideStatusNotice()
          }
        } catch {
          hideStatusNotice()
        }
      }

      function showStatusNotice(message, warning) {
        noticeText.innerHTML = message
        notice.classList.toggle('warning', warning)
        notice.classList.add('visible')
      }

      function hideStatusNotice() {
        notice.classList.remove('visible', 'warning')
      }

      refreshStatusNotice()
      statusTimer = window.setInterval(refreshStatusNotice, 1500)
      window.addEventListener('pagehide', () => {
        if (statusTimer !== null) window.clearInterval(statusTimer)
      })
    </script>
  </body>
</html>
`
}

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

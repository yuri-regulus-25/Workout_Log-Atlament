import { initializeBrandingLogo } from './frontend-common/branding/index.js'
import { initializeCharacterEasterEgg } from './frontend-common/easter-egg/index.js'

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

const brandingLogo = initializeBrandingLogo({
  image: document.getElementById('portal-logo'),
  trigger: document.getElementById('portal-logo-trigger'),
  basePath: './frontend-common/branding/assets/',
})

const characterEasterEgg = initializeCharacterEasterEgg({
  trigger: document.getElementById('portal-character-trigger'),
  host: document.body,
  assetBasePath: './frontend-common/easter-egg/assets/',
})

window.addEventListener('pagehide', () => {
  brandingLogo.dispose()
  characterEasterEgg.dispose()
})

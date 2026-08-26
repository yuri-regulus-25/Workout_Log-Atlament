import { initializeBrandingLogo } from './frontend-common/branding/index.js'
import { initializeCharacterEasterEgg } from './frontend-common/easter-egg/index.js'
import { getAfStatus } from './frontend-common/af-client.js'

const notice = document.getElementById('sync-notice')
const noticeText = document.getElementById('sync-notice-text')
let statusTimer = null

async function refreshStatusNotice() {
  try {
    const payload = await getAfStatus()
    const status = payload.data
    const startupRunning = status?.operations?.startup === 'running'
    const manualSyncRunning = status?.operations?.manualSync === 'running'
    const runtimeRequired = Array.isArray(status?.requiredActions)
      && status.requiredActions.includes('RUNTIME_DATA_REQUIRED')
    const localFallbackActive = status?.components?.github === 'degraded'
      && status?.components?.runtimeData === 'available'

    notice.classList.remove('warning')
    if (startupRunning) {
      showStatusNotice('&#21516;&#26399;&#12487;&#12540;&#12479;&#12434;&#21462;&#24471;&#12375;&#12390;&#12356;&#12414;&#12377;&#12290;', false)
    } else if (manualSyncRunning) {
      showStatusNotice('&#12522;&#12514;&#12540;&#12488;&#12487;&#12540;&#12479;&#12434;&#21516;&#26399;&#12375;&#12390;&#12356;&#12414;&#12377;&#12290;', false)
    } else if (runtimeRequired) {
      showStatusNotice('&#21516;&#26399;&#28168;&#12415;&#12487;&#12540;&#12479;&#12364;&#12354;&#12426;&#12414;&#12379;&#12435;&#12290;<a href="/settings/">Application Settings</a>&#12391;&#35373;&#23450;&#12392;&#21516;&#26399;&#12434;&#30906;&#35469;&#12375;&#12390;&#12367;&#12384;&#12373;&#12356;&#12290;', true)
    } else if (localFallbackActive) {
      showStatusNotice('&#12522;&#12514;&#12540;&#12488;&#21516;&#26399;&#12395;&#22833;&#25943;&#12375;&#12414;&#12375;&#12383;&#12290;&#20445;&#23384;&#28168;&#12415;&#12487;&#12540;&#12479;&#12434;&#34920;&#31034;&#12375;&#12390;&#12356;&#12414;&#12377;&#12290;<a href="/settings/">Application Settings</a>&#12391;Repository&#35373;&#23450;&#12434;&#30906;&#35469;&#12375;&#12390;&#12367;&#12384;&#12373;&#12356;&#12290;', true)
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



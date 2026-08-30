import { initializeBrandingLogo, initializeStoredBrandVariant } from './frontend-common/branding/index.js'
import { initializeCharacterEasterEgg } from './frontend-common/easter-egg/index.js'
import { portalCardApplications } from './frontend-common/navigation/application-registry.js'
import { initializeStoredTheme } from './frontend-common/theme/index.js'
import { deriveApplicationReadiness, getAfStatus } from './frontend-common/af-client.js'

const storedBrandVariant = initializeStoredBrandVariant()
const storedTheme = initializeStoredTheme()
const notice = document.getElementById('sync-notice')
const noticeText = document.getElementById('sync-notice-text')
const noticeIcon = document.getElementById('sync-notice-icon')
const appGrid = document.getElementById('portal-app-grid')
const successVisibleMs = 3000
const successFadeMs = 1500
let statusTimer = null
let successFadeTimer = null
let successHideTimer = null
let noticeState = 'hidden'
let syncWasRunning = false

renderApplicationCards()

async function refreshStatusNotice() {
  try {
    const payload = await getAfStatus()
    const status = payload.data
    const startupRunning = status?.operations?.startup === 'running'
    const manualSyncRunning = status?.operations?.manualSync === 'running'
    const startupFailed = status?.operations?.startup === 'failed'
    const manualSyncFailed = status?.operations?.manualSync === 'failed'
    const readiness = status?.readiness ?? deriveApplicationReadiness(status)
    const runtimeRequired = readiness.state === 'unavailable'
      && readiness.requiredActions.includes('RUNTIME_DATA_REQUIRED')
    const localFallbackActive = readiness.state === 'degraded'
      && readiness.degradedComponents.includes('github')

    if (startupRunning) {
      syncWasRunning = true
      showStatusNotice('GitHubからデータを取得しています。', 'loading')
    } else if (manualSyncRunning) {
      syncWasRunning = true
      showStatusNotice('GitHubからデータを取得しています。', 'loading')
    } else if (runtimeRequired) {
      syncWasRunning = false
      showStatusNotice('同期済みデータがありません。設定情報と同期情報を確認してください。', 'warning', 'mdi-alert-circle-outline')
    } else if (localFallbackActive) {
      syncWasRunning = false
      showStatusNotice('取得に失敗しました。設定を確認の上、手動同期を行ってください。', 'warning', 'mdi-alert-circle-outline')
    } else if (syncWasRunning && (startupFailed || manualSyncFailed)) {
      syncWasRunning = false
      showStatusNotice('同期データを取得できませんでした。', 'error', 'mdi-alert-box-outline')
    } else if (syncWasRunning) {
      syncWasRunning = false
      showSuccessNotice()
    } else if (noticeState === 'success' || noticeState === 'success-fading' || noticeState === 'error') {
      return
    } else {
      hideStatusNotice()
    }
  } catch {
    syncWasRunning = false
    showStatusNotice('同期ステータスを確認できませんでした。', 'error', 'mdi-alert-box-outline')
  }
}

function showStatusNotice(message, state, iconClass = '') {
  clearSuccessTimers()
  noticeState = state
  noticeText.innerHTML = message
  notice.classList.remove('loading', 'success', 'warning', 'error', 'fading')
  notice.classList.add(state)
  noticeIcon.className = `sync-icon mdi ${iconClass}`.trim()
  notice.classList.add('visible')
}

function showSuccessNotice() {
  showStatusNotice('同期データを取得しました。', 'success', 'mdi-check-circle-outline')
  successFadeTimer = window.setTimeout(() => {
    if (noticeState !== 'success') return
    noticeState = 'success-fading'
    notice.classList.add('fading')
    successHideTimer = window.setTimeout(() => {
      if (noticeState === 'success-fading') {
        hideStatusNotice()
      }
    }, successFadeMs)
  }, successVisibleMs)
}

function hideStatusNotice() {
  clearSuccessTimers()
  noticeState = 'hidden'
  notice.classList.remove('visible', 'loading', 'success', 'warning', 'error', 'fading')
  noticeIcon.className = 'sync-icon mdi'
}

function clearSuccessTimers() {
  if (successFadeTimer !== null) {
    window.clearTimeout(successFadeTimer)
    successFadeTimer = null
  }
  if (successHideTimer !== null) {
    window.clearTimeout(successHideTimer)
    successHideTimer = null
  }
}

refreshStatusNotice()
statusTimer = window.setInterval(refreshStatusNotice, 1500)
window.addEventListener('pagehide', () => {
  if (statusTimer !== null) window.clearInterval(statusTimer)
  clearSuccessTimers()
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
  storedBrandVariant.dispose()
  storedTheme.dispose()
})

function renderApplicationCards() {
  if (!appGrid) return

  appGrid.replaceChildren(...portalCardApplications.map(createApplicationCard))
}

function createApplicationCard(application) {
  const card = document.createElement('a')
  card.className = 'app-card'
  card.href = application.route

  const category = document.createElement('span')
  category.className = 'app-category'
  category.textContent = application.portalCategory ?? application.displayName

  const title = document.createElement('strong')
  title.className = 'app-title'
  title.textContent = application.displayName

  const pointer = document.createElement('span')
  pointer.className = 'app-pointer'
  pointer.textContent = application.portalPointer ?? ''

  const frameworkBadge = document.createElement('small')
  frameworkBadge.className = 'framework-badge'

  const frameworkLabel = document.createElement('span')
  frameworkLabel.className = 'framework-label'
  frameworkLabel.textContent = 'Built with'

  const frameworkStack = document.createElement('span')
  frameworkStack.className = 'framework-stack'
  frameworkStack.append(createFrameworkIcon(application), document.createTextNode(application.frameworkName ?? ''))
  frameworkBadge.append(frameworkLabel, frameworkStack)

  card.append(category, title, pointer, frameworkBadge)
  return card
}

function createFrameworkIcon(application) {
  if (application.frameworkIconHref) {
    const icon = document.createElement('img')
    icon.src = application.frameworkIconHref
    icon.alt = ''
    icon.className = 'framework-icon'
    return icon
  }

  const icon = document.createElement('span')
  icon.className = `framework-icon mdi ${application.frameworkIconClass ?? application.iconClass}`
  icon.setAttribute('aria-hidden', 'true')
  return icon
}



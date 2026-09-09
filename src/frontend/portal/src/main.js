import { initializeBrandingLogo, initializeStoredBrandVariant } from './frontend-common/branding/index.js'
import { initializeCharacterEasterEgg } from './frontend-common/easter-egg/index.js'
import { portalCardApplications } from './frontend-common/navigation/application-registry.js'
import { initializeStoredTheme } from './frontend-common/theme/index.js'
import { deriveApplicationReadiness, getAfStatus } from './frontend-common/af-client.js'
import { renderApplicationCards } from './portal-application-cards.js'
import { initializePortalStatusNotice } from './portal-status-notice.js'

const storedBrandVariant = initializeStoredBrandVariant()
const storedTheme = initializeStoredTheme()
const notice = document.getElementById('sync-notice')
const noticeText = document.getElementById('sync-notice-text')
const noticeIcon = document.getElementById('sync-notice-icon')
const appGrid = document.getElementById('portal-app-grid')

// Portal は Application Shell の注入対象ではなく、入口画面として独立した layout と header を所有する。
// Theme/Brand/Easter Egg は各 Application と同じ共有 initializer を使い、状態管理を分岐させない。
renderApplicationCards(appGrid, portalCardApplications)

const statusNotice = initializePortalStatusNotice({
  notice,
  noticeText,
  noticeIcon,
  getAfStatus,
  deriveApplicationReadiness,
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
  statusNotice.dispose()
  brandingLogo.dispose()
  characterEasterEgg.dispose()
  storedBrandVariant.dispose()
  storedTheme.dispose()
})



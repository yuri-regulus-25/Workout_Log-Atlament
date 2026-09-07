import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Portal composition contract', () => {
  it('keeps Portal shell initialization separate from sync notice behavior', () => {
    const main = readFileSync('src/frontend/portal/src/main.js', 'utf8')
    const notice = readFileSync('src/frontend/portal/src/portal-status-notice.js', 'utf8')

    expect(main).toContain('renderApplicationCards(appGrid, portalCardApplications)')
    expect(main).toContain('initializePortalStatusNotice')
    expect(main).toContain('initializeBrandingLogo')
    expect(main).toContain('initializeCharacterEasterEgg')
    expect(main).not.toContain('function showStatusNotice')
    expect(main).not.toContain('status?.runtimeData?.fallbackActive === true')
    expect(notice).toContain('status?.runtimeData?.fallbackActive === true')
    expect(notice).toContain('同期済みデータがありません')
    expect(notice).toContain('最終同期データを利用しています')
    expect(notice).toContain('dispose()')
  })
})

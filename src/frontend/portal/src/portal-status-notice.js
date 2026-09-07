export function initializePortalStatusNotice({ notice, noticeText, noticeIcon, getAfStatus, deriveApplicationReadiness, intervalMs = 1500 }) {
  const successVisibleMs = 3000
  const successFadeMs = 1500
  let statusTimer = null
  let successFadeTimer = null
  let successHideTimer = null
  let noticeState = 'hidden'
  let syncWasRunning = false

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
      const fallbackActive = status?.runtimeData?.fallbackActive === true

      if (startupRunning) {
        syncWasRunning = true
        showStatusNotice('GitHubからデータを取得しています。', 'loading')
      } else if (manualSyncRunning) {
        syncWasRunning = true
        showStatusNotice('GitHubからデータを取得しています。', 'loading')
      } else if (runtimeRequired) {
        syncWasRunning = false
        showStatusNotice('同期済みデータがありません。設定情報と同期情報を確認してください。', 'warning', 'mdi-alert-circle-outline')
      } else if (fallbackActive) {
        syncWasRunning = false
        const generatedAt = status?.runtimeData?.currentGeneratedAt
        const suffix = generatedAt ? ` 最終生成: ${generatedAt}` : ''
        showStatusNotice(`最終同期データを利用しています${suffix}`, 'warning', 'mdi-alert-circle-outline')
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

  void refreshStatusNotice()
  statusTimer = window.setInterval(refreshStatusNotice, intervalMs)

  return {
    dispose() {
      if (statusTimer !== null) window.clearInterval(statusTimer)
      clearSuccessTimers()
    },
  }
}

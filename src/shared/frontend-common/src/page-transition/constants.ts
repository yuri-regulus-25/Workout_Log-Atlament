const isAndroidWebView =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('AtlamentAndroidWebView')

export const pageTransitionClassName = isAndroidWebView
  ? 'atl-page-transition atl-page-transition-android'
  : 'atl-page-transition'

export const pageTransition = {
  distancePx: 32,
  durationMs: isAndroidWebView ? 0 : 240,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  direction: 'right-to-left',
  mode: 'entry-only',
} as const

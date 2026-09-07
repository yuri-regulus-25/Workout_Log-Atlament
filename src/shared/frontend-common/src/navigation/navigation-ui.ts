import { initializeBrandingLogo } from '../branding/index.js'
import { initializeCharacterEasterEgg } from '../easter-egg/index.js'
import { initializeThemeToggle } from '../theme/index.js'
import { drawerApplications, getApplicationMetadata, type ApplicationMetadata } from './apps'
import type { ApplicationRouteId } from './routes'

export type AppScreenHeader = {
  eyebrow: string
  title: string
  description: string | readonly string[]
  ariaLabel?: string
}

export type AppNavigationOptions = {
  currentRouteId: ApplicationRouteId
  shell?: HTMLElement | null
  logoBasePath?: string
  easterEggBasePath?: string
  screen?: AppScreenHeader
}

export type AppNavigationController = {
  dispose(): void
  focusTitle(): void
  updateScreen(screen: AppScreenHeader): void
}

const logoSourcePath = '/frontend-common/branding/assets/logo_svg_primary.svg'
const logoBasePath = '/frontend-common/branding/assets/'
const easterEggBasePath = '/frontend-common/easter-egg/assets/'
const swipeEdgeWidth = 24
const swipeOpenDistance = 72
const swipeMaxVerticalDrift = 48

export function initializeAppNavigation(options: AppNavigationOptions): AppNavigationController {
  const shell = options.shell ?? document.querySelector<HTMLElement>('.app-shell')

  // Portal remains the entry surface and owns its own header. Other apps receive the shared drawer
  // so cross-app navigation can be changed in one place.
  if (!shell || options.currentRouteId === 'portal') {
    return { dispose() {}, focusTitle() {}, updateScreen() {} }
  }

  const drawer = createDrawer(options.currentRouteId, 'desktop')
  const mobileDrawer = createDrawer(options.currentRouteId, 'mobile')
  const applicationShell = createApplicationShell(shell, options.screen ?? defaultScreenFor(options.currentRouteId))
  const overlay = document.createElement('button')
  overlay.className = 'atl-navigation-overlay'
  overlay.type = 'button'
  overlay.setAttribute('aria-label', 'Close navigation')

  const parent = applicationShell.backgroundParent
  const nextSibling = applicationShell.backgroundNextSibling
  applicationShell.frame.prepend(drawer.element)
  document.body.append(overlay, mobileDrawer.element)
  document.body.classList.add('atl-has-navigation')

  const brandingControllers = [
    initializeBrandingLogo({
      image: drawer.logoImage,
      trigger: drawer.logoTrigger,
      basePath: options.logoBasePath ?? logoBasePath,
    }),
    initializeBrandingLogo({
      image: mobileDrawer.logoImage,
      trigger: mobileDrawer.logoTrigger,
      basePath: options.logoBasePath ?? logoBasePath,
    }),
    initializeThemeToggle({ trigger: drawer.themeTrigger }),
    initializeThemeToggle({ trigger: mobileDrawer.themeTrigger }),
    initializeCharacterEasterEgg({
      trigger: applicationShell.characterTrigger,
      host: document.body,
      assetBasePath: options.easterEggBasePath ?? easterEggBasePath,
    }),
  ]

  let open = false

  function setOpen(nextOpen: boolean) {
    // Mobile drawer state is expressed on body and aria attributes so CSS, overlay, and assistive
    // technology all read the same source of truth.
    open = nextOpen
    document.body.classList.toggle('atl-navigation-open', open)
    applicationShell.mobileMenuButton.setAttribute('aria-expanded', String(open))
    mobileDrawer.element.setAttribute('aria-hidden', String(!open))
  }

  function handleNavigationClick(event: MouseEvent) {
    if ((event.target as HTMLElement | null)?.closest('a')) {
      setOpen(false)
    }
  }

  function openDrawer() {
    setOpen(true)
  }

  function closeDrawer() {
    setOpen(false)
  }

  let swipeStart: { x: number; y: number } | null = null

  function handleTouchStart(event: TouchEvent) {
    if (open || event.touches.length !== 1) {
      swipeStart = null
      return
    }

    const touch = event.touches[0]
    swipeStart = touch.clientX <= swipeEdgeWidth ? { x: touch.clientX, y: touch.clientY } : null
  }

  function handleTouchMove(event: TouchEvent) {
    if (!swipeStart || event.touches.length !== 1) {
      return
    }

    const touch = event.touches[0]
    const deltaX = touch.clientX - swipeStart.x
    const deltaY = Math.abs(touch.clientY - swipeStart.y)
    if (deltaX >= swipeOpenDistance && deltaY <= swipeMaxVerticalDrift) {
      setOpen(true)
      swipeStart = null
    } else if (deltaY > swipeMaxVerticalDrift) {
      swipeStart = null
    }
  }

  function handleTouchEnd() {
    swipeStart = null
  }

  applicationShell.mobileMenuButton.addEventListener('click', openDrawer)
  overlay.addEventListener('click', closeDrawer)
  mobileDrawer.element.addEventListener('click', handleNavigationClick)
  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchmove', handleTouchMove, { passive: true })
  document.addEventListener('touchend', handleTouchEnd)
  setOpen(false)

  return {
    dispose() {
      applicationShell.mobileMenuButton.removeEventListener('click', openDrawer)
      overlay.removeEventListener('click', closeDrawer)
      mobileDrawer.element.removeEventListener('click', handleNavigationClick)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      brandingControllers.forEach((controller) => controller.dispose())
      drawer.element.remove()
      mobileDrawer.element.remove()
      overlay.remove()
      applicationShell.dispose()
      document.body.classList.remove('atl-navigation-open', 'atl-has-navigation')

      if (parent) {
        parent.insertBefore(shell, nextSibling)
      }
    },
    focusTitle() {
      applicationShell.focusTitle()
    },
    updateScreen(screen: AppScreenHeader) {
      applicationShell.updateScreen(screen)
    },
  }
}

function createApplicationShell(shell: HTMLElement, screen: AppScreenHeader) {
  const backgroundParent = shell.parentElement
  const backgroundNextSibling = shell.nextSibling
  const background = document.createElement('div')
  background.className = 'app-background'

  backgroundParent?.insertBefore(background, shell)
  background.append(shell)
  shell.classList.add('atl-application-shell')

  const header = document.createElement('header')
  header.className = 'app-header'

  const mobileMenuButton = document.createElement('button')
  mobileMenuButton.className = 'atl-mobile-menu-button'
  mobileMenuButton.type = 'button'
  mobileMenuButton.setAttribute('aria-label', 'Open navigation')
  mobileMenuButton.setAttribute('aria-controls', 'atl-mobile-navigation-drawer')
  mobileMenuButton.innerHTML = '<i class="mdi mdi-menu" aria-hidden="true"></i>'

  const title = document.createElement('h1')
  title.className = 'app-title atl-character-trigger'
  title.tabIndex = -1
  header.append(mobileMenuButton, title)

  const body = document.createElement('div')
  body.className = 'app-body'

  const appContent = document.createElement('main')
  appContent.className = 'app-content'
  appContent.setAttribute('aria-label', 'Screen content')

  const appScroll = document.createElement('div')
  appScroll.className = 'app-scroll'

  const content = shell.querySelector<HTMLElement>('[data-application-shell-content]')
  if (content?.parentElement === shell) {
    content.classList.add('atl-screen-content')
    shell.insertBefore(body, content)
    appScroll.append(content)
  } else {
    const fallbackContent = document.createElement('div')
    fallbackContent.className = 'atl-screen-content'
    fallbackContent.setAttribute('data-application-shell-content', '')
    while (shell.firstChild) {
      fallbackContent.append(shell.firstChild)
    }
    shell.append(body)
    appScroll.append(fallbackContent)
  }
  appContent.append(appScroll)
  body.append(header, appContent)

  function updateScreen(nextScreen: AppScreenHeader) {
    title.setAttribute('aria-label', nextScreen.ariaLabel ?? nextScreen.title)
    title.textContent = `${nextScreen.title} - ${headerSummary(nextScreen.description)}`
  }

  function focusTitle() {
    title.focus()
  }

  updateScreen(screen)

  return {
    backgroundParent,
    backgroundNextSibling,
    characterTrigger: title,
    frame: shell,
    mobileMenuButton,
    dispose() {
      const screenContent = appScroll.querySelector<HTMLElement>('[data-application-shell-content]')
      if (screenContent) {
        screenContent.classList.remove('atl-screen-content')
        shell.append(screenContent)
      }
      body.remove()
      shell.classList.remove('atl-application-shell')
      background.remove()
    },
    focusTitle,
    updateScreen,
  }
}

function headerSummary(description: string | readonly string[]): string {
  const lines: readonly string[] = typeof description === 'string' ? description.split('\n') : description
  return lines.at(-1) ?? ''
}

function defaultScreenFor(routeId: ApplicationRouteId): AppScreenHeader {
  const application = drawerApplications.find((item) => item.id === routeId)
  const title = application?.displayName ?? routeId

  return {
    eyebrow: `Atlament / ${title}`,
    title,
    description: '',
    ariaLabel: `Atlament ${title}`,
  }
}

function createDrawer(currentRouteId: ApplicationRouteId, variant: 'desktop' | 'mobile') {
  const element = document.createElement('aside')
  element.className = `app-navigation atl-navigation-drawer atl-navigation-drawer-${variant}`
  if (variant === 'mobile') {
    element.id = 'atl-mobile-navigation-drawer'
  }

  const { trigger: logoTrigger, image: logoImage } = createLogoTrigger('Toggle Atlament logo variant')
  logoTrigger.classList.add('atl-navigation-logo-trigger')
  const themeTrigger = createThemeTrigger()
  themeTrigger.classList.add('atl-navigation-theme-trigger')
  const topRegion = document.createElement('div')
  topRegion.className = 'atl-navigation-region atl-navigation-region-top'
  const scrollRegion = document.createElement('div')
  scrollRegion.className = 'atl-navigation-region atl-navigation-region-scroll'
  const bottomRegion = document.createElement('div')
  bottomRegion.className = 'atl-navigation-region atl-navigation-region-bottom'

  const portalLink = createNavigationLink(getApplicationMetadata('portal'), currentRouteId)
  portalLink.classList.add('atl-navigation-portal-link')
  const nav = document.createElement('nav')
  nav.className = 'navigation-items atl-navigation-menu'
  nav.setAttribute('aria-label', 'Application navigation')
  nav.append(...drawerApplications
    .filter((application) => application.id !== 'portal')
    .map((application) => createNavigationLink(application, currentRouteId)))

  // The Theme trigger is deliberately outside the nav item list; it changes application appearance
  // rather than navigating to a route.
  topRegion.append(logoTrigger, portalLink)
  scrollRegion.append(nav)
  bottomRegion.append(themeTrigger)
  element.append(topRegion, scrollRegion, bottomRegion)

  return { element, logoTrigger, logoImage, themeTrigger }
}

function createLogoTrigger(label: string) {
  const trigger = document.createElement('button')
  trigger.className = 'atl-logo-trigger'
  trigger.type = 'button'
  trigger.setAttribute('aria-label', label)

  const image = document.createElement('img')
  image.className = 'atl-logo'
  image.src = logoSourcePath
  image.alt = ''

  trigger.append(image)

  return { trigger, image }
}

function createThemeTrigger() {
  const trigger = document.createElement('button')
  trigger.className = 'atl-theme-trigger'
  trigger.type = 'button'

  const icon = document.createElement('i')
  icon.className = 'mdi mdi-theme-light-dark'
  icon.setAttribute('aria-hidden', 'true')

  trigger.append(icon)

  return trigger
}

function createNavigationLink(application: ApplicationMetadata, currentRouteId: ApplicationRouteId) {
  const link = document.createElement('a')
  link.className = 'navigation-item atl-navigation-link'
  link.href = application.route
  if (application.id === currentRouteId) {
    link.classList.add('active', 'navigation-item--active')
    link.setAttribute('aria-current', 'page')
  }

  const icon = document.createElement('i')
  icon.className = `mdi ${application.iconClass}`
  icon.setAttribute('aria-hidden', 'true')

  const label = document.createElement('span')
  label.className = 'navigation-label'
  label.textContent = application.displayName

  link.append(icon, label)

  return link
}

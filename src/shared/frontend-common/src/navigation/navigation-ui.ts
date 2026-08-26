import { initializeBrandingLogo } from '../branding/index.js'
import { drawerApplications, type ApplicationMetadata } from './apps'
import type { ApplicationRouteId } from './routes'

export type AppNavigationOptions = {
  currentRouteId: ApplicationRouteId
  shell?: HTMLElement | null
  logoBasePath?: string
}

export type AppNavigationController = {
  dispose(): void
}

const logoSourcePath = '/frontend-common/branding/assets/logo_svg_primary.svg'
const logoBasePath = '/frontend-common/branding/assets/'

export function initializeAppNavigation(options: AppNavigationOptions): AppNavigationController {
  const shell = options.shell ?? document.querySelector<HTMLElement>('.app-shell')

  if (!shell || options.currentRouteId === 'portal') {
    return { dispose() {} }
  }

  const layout = document.createElement('div')
  layout.className = 'atl-navigation-layout'

  const drawer = createDrawer(options.currentRouteId, 'desktop')
  const mobileHeader = createMobileHeader()
  const mobileDrawer = createDrawer(options.currentRouteId, 'mobile')
  const overlay = document.createElement('button')
  overlay.className = 'atl-navigation-overlay'
  overlay.type = 'button'
  overlay.setAttribute('aria-label', 'Close navigation')

  const parent = shell.parentElement
  parent?.insertBefore(layout, shell)
  layout.append(drawer.element, shell)
  document.body.prepend(mobileHeader.element)
  document.body.append(overlay, mobileDrawer.element)
  document.body.classList.add('atl-has-navigation')

  const brandingControllers = [
    initializeBrandingLogo({
      image: drawer.logoImage,
      trigger: drawer.logoTrigger,
      basePath: options.logoBasePath ?? logoBasePath,
    }),
    initializeBrandingLogo({
      image: mobileHeader.logoImage,
      trigger: mobileHeader.logoTrigger,
      basePath: options.logoBasePath ?? logoBasePath,
    }),
    initializeBrandingLogo({
      image: mobileDrawer.logoImage,
      trigger: mobileDrawer.logoTrigger,
      basePath: options.logoBasePath ?? logoBasePath,
    }),
  ]

  let open = false

  function setOpen(nextOpen: boolean) {
    open = nextOpen
    document.body.classList.toggle('atl-navigation-open', open)
    mobileHeader.menuButton.setAttribute('aria-expanded', String(open))
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

  mobileHeader.menuButton.addEventListener('click', openDrawer)
  overlay.addEventListener('click', closeDrawer)
  mobileDrawer.element.addEventListener('click', handleNavigationClick)
  setOpen(false)

  return {
    dispose() {
      mobileHeader.menuButton.removeEventListener('click', openDrawer)
      overlay.removeEventListener('click', closeDrawer)
      mobileDrawer.element.removeEventListener('click', handleNavigationClick)
      brandingControllers.forEach((controller) => controller.dispose())
      drawer.element.remove()
      mobileHeader.element.remove()
      mobileDrawer.element.remove()
      overlay.remove()
      document.body.classList.remove('atl-navigation-open', 'atl-has-navigation')

      if (parent && layout.parentElement === parent) {
        parent.insertBefore(shell, layout)
      }
      layout.remove()
    },
  }
}

function createMobileHeader() {
  const element = document.createElement('header')
  element.className = 'atl-mobile-header'

  const menuButton = document.createElement('button')
  menuButton.className = 'atl-mobile-menu-button'
  menuButton.type = 'button'
  menuButton.setAttribute('aria-label', 'Open navigation')
  menuButton.setAttribute('aria-controls', 'atl-mobile-navigation-drawer')
  menuButton.innerHTML = '<i class="mdi mdi-menu" aria-hidden="true"></i>'

  const { trigger: logoTrigger, image: logoImage } = createLogoTrigger('Toggle Atlament logo variant')

  element.append(menuButton, logoTrigger)

  return { element, menuButton, logoTrigger, logoImage }
}

function createDrawer(currentRouteId: ApplicationRouteId, variant: 'desktop' | 'mobile') {
  const element = document.createElement('aside')
  element.className = `atl-navigation-drawer atl-navigation-drawer-${variant}`
  if (variant === 'mobile') {
    element.id = 'atl-mobile-navigation-drawer'
  }

  const { trigger: logoTrigger, image: logoImage } = createLogoTrigger('Toggle Atlament logo variant')
  logoTrigger.classList.add('atl-navigation-logo-trigger')

  const nav = document.createElement('nav')
  nav.className = 'atl-navigation-menu'
  nav.setAttribute('aria-label', 'Application navigation')
  nav.append(...drawerApplications.map((application) => createNavigationLink(application, currentRouteId)))

  element.append(logoTrigger, nav)

  return { element, logoTrigger, logoImage }
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

function createNavigationLink(application: ApplicationMetadata, currentRouteId: ApplicationRouteId) {
  const link = document.createElement('a')
  link.className = 'atl-navigation-link'
  link.href = application.route
  if (application.id === currentRouteId) {
    link.classList.add('active')
    link.setAttribute('aria-current', 'page')
  }

  const icon = document.createElement('i')
  icon.className = `mdi ${application.iconClass}`
  icon.setAttribute('aria-hidden', 'true')

  const label = document.createElement('span')
  label.textContent = application.displayName

  link.append(icon, label)

  return link
}

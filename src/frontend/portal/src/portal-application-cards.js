export function renderApplicationCards(appGrid, applications) {
  if (!appGrid) return

  appGrid.replaceChildren(...applications.map(createApplicationCard))
}

export function createApplicationCard(application) {
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
  frameworkStack.append(...createFrameworkStackItems(application))
  frameworkBadge.append(frameworkLabel, frameworkStack)

  card.append(category, title, pointer, frameworkBadge)
  return card
}

export function createFrameworkStackDescriptors(application) {
  if (Array.isArray(application.frameworkIcons) && application.frameworkIcons.length > 0) {
    const frameworkNames = (application.frameworkName ?? '').split(/\s*\+\s*/).filter(Boolean)
    return application.frameworkIcons.flatMap((frameworkIcon, index) => {
      const item = {
        type: 'framework',
        name: frameworkNames[index] ?? '',
        icon: {
          href: frameworkIcon.href,
          className: frameworkIcon.className ?? application.iconClass,
        },
      }

      return index === 0 ? [item] : [{ type: 'separator', text: ' + ' }, item]
    })
  }

  return [{
    type: 'framework',
    name: application.frameworkName ?? '',
    icon: {
      href: application.frameworkIconHref,
      className: application.frameworkIconClass ?? application.iconClass,
    },
  }]
}

function createFrameworkStackItems(application) {
  return createFrameworkStackDescriptors(application).map((descriptor) => {
    if (descriptor.type === 'separator') {
      return document.createTextNode(descriptor.text)
    }

    const frameworkItem = document.createElement('span')
    frameworkItem.className = 'framework-item'
    frameworkItem.append(createFrameworkIcon(descriptor.icon), document.createTextNode(descriptor.name))
    return frameworkItem
  })
}

function createFrameworkIcon(iconDescriptor) {
  if (iconDescriptor.href) {
    const icon = document.createElement('img')
    icon.src = iconDescriptor.href
    icon.alt = ''
    icon.className = 'framework-icon'
    return icon
  }

  const icon = document.createElement('span')
  icon.className = `framework-icon mdi ${iconDescriptor.className}`
  icon.setAttribute('aria-hidden', 'true')
  return icon
}

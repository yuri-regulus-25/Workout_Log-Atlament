/**
 * Portal の application launcher cards を描画する。
 *
 * Application metadata を唯一の入力にし、カード側では route/framework/icon の意味を再定義しない。
 */
export function renderApplicationCards(appGrid, applications) {
  if (!appGrid) return

  appGrid.replaceChildren(...applications.map(createApplicationCard))

  const count = document.getElementById('launcher-count')
  if (count) {
    count.textContent = `${applications.length} Apps`
  }
}

export function createApplicationCard(application) {
  const card = document.createElement('a')
  card.className = 'application-card'
  card.href = application.route
  if (application.portalDescription) {
    card.title = application.portalDescription
  }

  const header = document.createElement('div')
  header.className = 'application-card-header'

  const applicationIcon = document.createElement('div')
  applicationIcon.className = 'application-icon'
  applicationIcon.append(createApplicationIcon(application))

  const arrow = document.createElement('i')
  arrow.className = 'mdi mdi-arrow-top-right application-arrow'
  arrow.setAttribute('aria-hidden', 'true')
  header.append(applicationIcon, arrow)

  const content = document.createElement('div')
  content.className = 'application-content'

  const category = document.createElement('span')
  category.className = 'application-category'
  category.textContent = application.portalCategory ?? application.displayName

  const title = document.createElement('h3')
  title.textContent = application.displayName

  const pointer = document.createElement('span')
  pointer.className = 'application-pointer'
  pointer.textContent = application.portalPointer ?? ''
  const description = document.createElement('span')
  description.className = 'application-description'
  description.textContent = application.portalDescription ?? ''
  content.append(category, title, pointer, description)

  const footer = document.createElement('div')
  footer.className = 'application-footer'
  const frameworkLabel = document.createElement('span')
  frameworkLabel.className = 'framework-label'
  frameworkLabel.textContent = 'Built with'
  footer.append(frameworkLabel, ...createFrameworkStackItems(application))

  card.append(header, content, footer)
  return card
}

function createApplicationIcon(application) {
  const icon = document.createElement('i')
  icon.className = `mdi ${application.iconClass}`
  icon.setAttribute('aria-hidden', 'true')
  return icon
}

/**
 * Built with 表示用の framework descriptor を作る。
 *
 * Resource Management の Vue + Vuetify のような複数 framework 表示は metadata の順序を維持する。
 */
export function createFrameworkStackDescriptors(application) {
  if (Array.isArray(application.frameworkIcons) && application.frameworkIcons.length > 0) {
    return application.frameworkIcons.flatMap((frameworkIcon, index) => {
      const item = {
        type: 'framework',
        name: frameworkIcon.name,
        href: frameworkIcon.href,
      }

      return index === 0 ? [item] : [{ type: 'separator', text: ' + ' }, item]
    })
  }

  return [{
    type: 'framework',
    name: application.frameworkName ?? '',
    href: application.frameworkIconHref,
  }]
}

function createFrameworkStackItems(application) {
  return createFrameworkStackDescriptors(application).map((descriptor) => {
    if (descriptor.type === 'separator') {
      return document.createTextNode(descriptor.text)
    }

    const frameworkItem = document.createElement('span')
    frameworkItem.className = 'framework-item'
    const icon = document.createElement('img')
    icon.src = descriptor.href
    icon.alt = ''
    icon.className = 'framework-icon'
    frameworkItem.append(icon, document.createTextNode(descriptor.name))
    return frameworkItem
  })
}

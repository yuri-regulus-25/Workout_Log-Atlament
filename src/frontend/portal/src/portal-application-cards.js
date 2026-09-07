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
  content.append(category, title, pointer)

  const footer = document.createElement('div')
  footer.className = 'application-footer'
  const framework = document.createElement('span')
  framework.textContent = application.frameworkName ?? ''
  footer.append(framework)

  card.append(header, content, footer)
  return card
}

function createApplicationIcon(application) {
  if (application.frameworkIconHref) {
    const icon = document.createElement('img')
    icon.src = application.frameworkIconHref
    icon.alt = ''
    icon.className = 'application-favicon'
    return icon
  }

  const icon = document.createElement('i')
  icon.className = `mdi ${application.iconClass}`
  icon.setAttribute('aria-hidden', 'true')
  return icon
}

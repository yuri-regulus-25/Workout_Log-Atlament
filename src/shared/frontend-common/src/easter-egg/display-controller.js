export function createEasterEggDisplayController({ host, assetBasePath = './frontend-common/easter-egg/assets/', displayMs = 5000, animationMs = 500 }) {
  let running = false
  let queue = 0
  let disposed = false
  let currentElement = null
  let timer = null

  async function enqueue(renderItem) {
    if (disposed) return
    if (running) {
      queue += 1
      return
    }
    await run(renderItem)
  }

  async function run(renderItem) {
    if (disposed || !host) return
    running = true
    const item = renderItem()
    currentElement = createCard(item, assetBasePath)
    host.append(currentElement)

    await nextFrame()
    currentElement.classList.add('is-visible')
    await delay(displayMs)
    currentElement.classList.remove('is-visible')
    await delay(animationMs)
    currentElement.remove()
    currentElement = null
    running = false

    if (queue > 0 && !disposed) {
      queue -= 1
      await run(renderItem)
    }
  }

  function dispose() {
    disposed = true
    queue = 0
    running = false
    if (timer !== null) globalThis.clearTimeout(timer)
    currentElement?.remove()
    currentElement = null
  }

  return { enqueue, dispose, getQueueSize: () => queue, isRunning: () => running }

  function delay(ms) {
    return new Promise((resolve) => {
      timer = globalThis.setTimeout(() => {
        timer = null
        resolve()
      }, ms)
    })
  }
}

function createCard({ asset, voice }, assetBasePath) {
  const snackbar = document.createElement('section')
  snackbar.className = 'atl-easter-egg-snackbar'
  snackbar.setAttribute('aria-live', 'polite')

  const dialog = document.createElement('div')
  dialog.className = 'atl-easter-egg-dialog'
  dialog.textContent = voice.text

  const image = document.createElement('img')
  image.className = 'atl-easter-egg-character'
  image.src = new URL(asset.filename, new URL(assetBasePath, window.location.href)).pathname
  image.alt = ''
  image.decoding = 'async'

  snackbar.append(dialog, image)
  return snackbar
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

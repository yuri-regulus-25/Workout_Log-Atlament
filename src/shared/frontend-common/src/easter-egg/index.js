export * from './assets.js'
export * from './display-controller.js'
export * from './selection.js'
export * from './trigger-controller.js'
export * from './voices.js'

import { createEasterEggDisplayController } from './display-controller.js'
import { selectEasterEgg } from './selection.js'
import { createTriggerController } from './trigger-controller.js'

export function initializeCharacterEasterEgg({ trigger, host = document.body, assetBasePath } = {}) {
  if (!trigger || !host) {
    return { dispose() {} }
  }

  const display = createEasterEggDisplayController({ host, assetBasePath })
  const controller = createTriggerController({
    threshold: 5,
    onTrigger: () => {
      void display.enqueue(() => selectEasterEgg())
    },
  })

  function handleClick() {
    controller.click()
  }

  trigger.addEventListener('click', handleClick)

  return {
    dispose() {
      trigger.removeEventListener('click', handleClick)
      controller.reset()
      display.dispose()
    },
  }
}

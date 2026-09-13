import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './style.css'

import { createApp, h } from 'vue'
import { RouterView } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import { router } from './router'

initializeStoredBrandVariant()
initializeStoredTheme()

createApp({ render: () => h(RouterView) })
  .use(router)
  .use(createVuetify({ components, directives }))
  .mount('#app')

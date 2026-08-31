import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './style.css'

import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import App from './App.vue'

initializeStoredBrandVariant()
initializeStoredTheme()

const vuetify = createVuetify({
  components,
  directives,
})

createApp(App).use(vuetify).mount('#app')

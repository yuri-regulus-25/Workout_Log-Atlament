import { createApp } from 'vue'
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import './style.css'
import DetailApp from './DetailApp.vue'

initializeStoredBrandVariant()
initializeStoredTheme()

createApp(DetailApp).mount('#app')

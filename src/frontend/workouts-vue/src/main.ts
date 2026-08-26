import { createApp } from 'vue'
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import './style.css'
import App from './App.vue'
import { router } from './router'

initializeStoredBrandVariant()
initializeStoredTheme()

createApp(App).use(router).mount('#app')

import { mount } from 'svelte'
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import './app.css'
import App from './App.svelte'

initializeStoredBrandVariant()
initializeStoredTheme()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

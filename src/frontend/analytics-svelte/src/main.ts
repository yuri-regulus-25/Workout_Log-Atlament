import { mount } from 'svelte'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import './app.css'
import App from './App.svelte'

initializeStoredTheme()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

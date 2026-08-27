import { render } from 'solid-js/web'
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import App from './App'
import './style.css'

const root = document.getElementById('root')

if (root) {
  initializeStoredBrandVariant()
  initializeStoredTheme()
  render(() => <App />, root)
}

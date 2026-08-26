import { render } from 'solid-js/web'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import App from './App'
import './style.css'

const root = document.getElementById('root')

if (root) {
  initializeStoredTheme()
  render(() => <App />, root)
}

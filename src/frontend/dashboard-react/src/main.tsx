import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import './index.css'
import App from './App.tsx'

initializeStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

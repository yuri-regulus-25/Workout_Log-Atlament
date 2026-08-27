import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding'
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme'
import './index.css'
import App from './App.tsx'

initializeStoredBrandVariant()
initializeStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

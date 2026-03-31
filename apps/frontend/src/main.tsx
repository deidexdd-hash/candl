import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Hide splash once React has painted the first frame
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash')
    if (splash) {
      splash.classList.add('hidden')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    }
  })
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Expose a global hook so App.tsx can dismiss the splash
// after auth/loading is fully complete — not after the first React frame.
;(window as any).__hideSplash = () => {
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.classList.add('hidden')
  splash.addEventListener('transitionend', () => splash.remove(), { once: true })
}

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

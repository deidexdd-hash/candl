import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { useAuthStore } from './store/authStore'

import { OnboardingPage } from './pages/OnboardingPage'
import { LunarPage }      from './pages/LunarPage'
import { CandlePickPage } from './pages/CandlePickPage'
import { LibraryPage }    from './pages/LibraryPage'
import { DiaryPage }      from './pages/DiaryPage'
import { ProfilePage }    from './pages/ProfilePage'
import { PaywallPage }    from './pages/PaywallPage'
import { TabBar }         from './components/TabBar'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function AppInner() {
  const { token, isNew, login } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()

    // Авторизация при старте
    if (!token) {
      fetch(`${import.meta.env.VITE_API_URL}/v1/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: WebApp.initData }),
      })
        .then(r => r.json())
        .then(data => {
          login(data.token, data.user)
          if (data.user.isNew) navigate('/onboarding')
          else navigate('/lunar')
        })
    }
  }, [])

  if (!token) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--tg-theme-text-color)' }}>Загрузка...</div>
  }

  const showTabs = !useLocation().pathname.startsWith('/onboarding')
    && !useLocation().pathname.startsWith('/paywall')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/lunar"      element={<LunarPage />} />
          <Route path="/pick"       element={<CandlePickPage />} />
          <Route path="/library"    element={<LibraryPage />} />
          <Route path="/library/:id" element={<LibraryPage />} />
          <Route path="/diary"      element={<DiaryPage />} />
          <Route path="/profile"    element={<ProfilePage />} />
          <Route path="/paywall"    element={<PaywallPage />} />
          <Route path="*"           element={<LunarPage />} />
        </Routes>
      </div>
      {showTabs && <TabBar />}
    </div>
  )
}

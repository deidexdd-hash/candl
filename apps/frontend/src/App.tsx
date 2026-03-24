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
  const { token, login, updateTier } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()

    const initData = WebApp.initData

    if (!initData) {
      // Вне Telegram — онбординг без авторизации
      navigate('/onboarding')
      return
    }

    const API = import.meta.env.VITE_API_URL

    // Всегда делаем свежую авторизацию при каждом открытии
    // Это гарантирует актуальный tier (в т.ч. после активации тест-режима)
    fetch(`${API}/v1/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          login(data.token, data.user)
          // Принудительно обновляем tier из свежего ответа
          updateTier(data.user.tier)
          navigate(data.user.isNew ? '/onboarding' : '/lunar')
        } else {
          navigate('/onboarding')
        }
      })
      .catch(() => {
        // Если нет сети — используем кэш
        if (token) navigate('/lunar')
        else navigate('/onboarding')
      })
  }, [])

  const location = useLocation()
  const hideTabs = location.pathname === '/onboarding' || location.pathname === '/paywall'

  // Показываем загрузку только пока initData есть и токена нет
  if (!token && WebApp.initData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
        Загрузка...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/onboarding"  element={<OnboardingPage />} />
          <Route path="/lunar"       element={<LunarPage />} />
          <Route path="/pick"        element={<CandlePickPage />} />
          <Route path="/library"     element={<LibraryPage />} />
          <Route path="/library/:id" element={<LibraryPage />} />
          <Route path="/diary"       element={<DiaryPage />} />
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/paywall"     element={<PaywallPage />} />
          <Route path="*"            element={<LunarPage />} />
        </Routes>
      </div>
      {!hideTabs && <TabBar />}
    </div>
  )
}

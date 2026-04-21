import { useEffect, useState, Component, ReactNode } from 'react'
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
import { AdminPage }      from './pages/AdminPage'
import { AssistantPage }  from './pages/AssistantPage'
import { TabBar }         from './components/TabBar'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } }
})

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', height: '100dvh', padding: 24, textAlign: 'center',
          background: 'var(--tg-theme-bg-color, #fff)',
          color: 'var(--tg-theme-text-color, #000)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🕯</div>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Что-то пошло не так</p>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 24 }}>
            Закройте и откройте приложение заново
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: 15, cursor: 'pointer',
            }}
          >Перезагрузить</button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen({ slow }: { slow: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100dvh',
      background: '#0d0a06',
    }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🕯</div>
      <p style={{ fontSize: 15, color: '#f5dfa0', marginBottom: 8, fontWeight: 500 }}>
        {slow ? 'Сервер просыпается...' : 'Загрузка...'}
      </p>
      {slow && (
        <p style={{ fontSize: 13, color: 'rgba(245,223,160,0.55)', maxWidth: 260, textAlign: 'center' }}>
          Первый запуск может занять до 30 секунд
        </p>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

// ── Main logic ────────────────────────────────────────────────────────────────
function AppInner() {
  const { token, login, updateTier } = useAuthStore()
  const navigate = useNavigate()
  // loading: null = не начали, true = грузим, false = готово
  const [loading, setLoading] = useState<boolean>(!token)
  const [slow, setSlow]       = useState(false)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()

    const initData = WebApp.initData

    // Вне Telegram — сразу онбординг
    if (!initData) {
      navigate('/onboarding')
      setLoading(false)
      ;(window as any).__hideSplash?.()
      return
    }

    // Если уже есть токен — показываем контент немедленно,
    // тихо обновляем tier в фоне
    if (token) {
      setLoading(false)
      ;(window as any).__hideSplash?.()
      refreshTierInBackground(initData)
      return
    }

    // Первый вход — нужна авторизация
    // Таймер «медленный сервер» — через 5 секунд показываем подсказку
    const slowTimer = setTimeout(() => setSlow(true), 5000)
    // Таймер аварийного выхода — через 25 секунд идём на онбординг
    const bailTimer = setTimeout(() => {
      clearTimeout(slowTimer)
      setLoading(false)
      ;(window as any).__hideSplash?.()
      navigate('/onboarding')
    }, 25000)

    doAuth(initData)
      .then(({ userToken, user }) => {
        login(userToken, user)
        updateTier(user.tier)
        navigate(user.isNew ? '/onboarding' : '/lunar')
      })
      .catch(() => navigate('/onboarding'))
      .finally(() => {
        clearTimeout(slowTimer)
        clearTimeout(bailTimer)
        setSlow(false)
        setLoading(false)
        ;(window as any).__hideSplash?.()
      })
  }, [])

  const location = useLocation()
  const hideTabs = ['/onboarding', '/paywall'].includes(location.pathname)

  if (loading) return <LoadingScreen slow={slow} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <Routes>
          <Route path="/onboarding"  element={<OnboardingPage />} />
          <Route path="/lunar"       element={<LunarPage />} />
          <Route path="/pick"        element={<CandlePickPage />} />
          <Route path="/library"     element={<LibraryPage />} />
          <Route path="/library/:id" element={<LibraryPage />} />
          <Route path="/diary"       element={<DiaryPage />} />
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/paywall"     element={<PaywallPage />} />
          <Route path="/admin"       element={<AdminPage />} />
          <Route path="/assistant"   element={<AssistantPage />} />
          <Route path="*"            element={<LunarPage />} />
        </Routes>
      </div>
      {!hideTabs && <TabBar />}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function doAuth(initData: string) {
  const API = import.meta.env.VITE_API_URL
  const res = await fetch(`${API}/v1/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  })
  const data = await res.json()
  if (!data.token) throw new Error('No token')
  return { userToken: data.token, user: data.user }
}

async function refreshTierInBackground(initData: string) {
  try {
    const { user } = await doAuth(initData)
    useAuthStore.getState().updateTier(user.tier)
    // Обновляем isAdmin — важно для отображения панели администратора
    useAuthStore.getState().login(
      useAuthStore.getState().token!,
      user
    )
  } catch {
    // тихо — не мешаем пользователю
  }
}

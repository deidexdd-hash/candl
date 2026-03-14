// OnboardingPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SLIDES = [
  { emoji: '🕯', title: 'Язык Пламени', body: 'Полная энциклопедия свечной магии. Подбор свечи, ритуалы, лунный календарь и практики — всё в одном месте.' },
  { emoji: '🌙', title: 'Луна — ваш проводник', body: 'Каждая фаза Луны открывает своё время для практики. Получайте уведомления в нужный момент.' },
  { emoji: '✨', title: 'Начнём', body: 'Бесплатный доступ — история, философия, таблица 13 цветов и подбор свечи 3 раза в день.' },
]

export function OnboardingPage() {
  const [slide, setSlide] = useState(0)
  const navigate = useNavigate()
  const isLast = slide === SLIDES.length - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
      padding: '60px 24px 40px', color: 'var(--tg-theme-text-color)', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>{SLIDES[slide].emoji}</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 16 }}>{SLIDES[slide].title}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--tg-theme-hint-color)', maxWidth: 300, margin: 0 }}>{SLIDES[slide].body}</p>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3,
            background: i === slide ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
            transition: 'width 0.2s' }} />
        ))}
      </div>

      <button onClick={() => isLast ? navigate('/lunar') : setSlide(s => s + 1)} style={{
        width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
        background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
        fontSize: 16, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {isLast ? 'Начать' : 'Далее'}
      </button>
    </div>
  )
}

// ProfilePage.tsx
export function ProfilePage() {
  const { user } = (window as any).__authStore?.getState() ?? {}
  const navigate = useNavigate()

  const TIER_NAMES: Record<string, string> = {
    free: 'Свеча 🕯 (бесплатно)',
    practitioner: 'Практик 🔥',
    master: 'Мастер ✨',
    annual: 'Годовой 🌙',
  }

  return (
    <div style={{ padding: '24px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Профиль</h1>

      <div style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Текущий тариф</div>
        <div style={{ fontSize: 17, fontWeight: 500 }}>{TIER_NAMES[user?.tier ?? 'free']}</div>
      </div>

      <button onClick={() => navigate('/paywall')} style={{
        width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', marginBottom: 12,
        background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
        fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Улучшить тариф
      </button>

      <button onClick={() => navigate('/notifications')} style={{
        width: '100%', padding: '13px 0', borderRadius: 10,
        border: '1px solid var(--tg-theme-hint-color)', background: 'none',
        color: 'var(--tg-theme-text-color)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Настройки уведомлений
      </button>
    </div>
  )
}

// DiaryPage.tsx — stub для v2
export function DiaryPage() {
  const navigate = useNavigate()
  const { isMaster } = { isMaster: false } // подключить useTier

  if (!isMaster) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--tg-theme-text-color)' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✍️</div>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Дневник практик</h2>
        <p style={{ color: 'var(--tg-theme-hint-color)', marginBottom: 28, lineHeight: 1.6 }}>
          Записывайте ритуалы, намерения и результаты. Доступно на тарифе Мастер.
        </p>
        <button onClick={() => navigate('/paywall')} style={{
          padding: '13px 32px', borderRadius: 10, border: 'none',
          background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
          fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>Открыть Мастер</button>
      </div>
    )
  }

  return <div style={{ padding: '24px 16px' }}>Дневник — скоро</div>
}

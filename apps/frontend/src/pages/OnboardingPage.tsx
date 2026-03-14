import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SLIDES = [
  { emoji: '🕯', title: 'Язык Пламени',       body: 'Полная энциклопедия свечной магии. Подбор свечи, ритуалы, лунный календарь и практики — всё в одном месте.' },
  { emoji: '🌙', title: 'Луна — ваш проводник', body: 'Каждая фаза Луны открывает своё время для практики. Получайте уведомления в нужный момент.' },
  { emoji: '✨', title: 'Начнём',               body: 'Бесплатный доступ — история, философия, таблица 13 цветов и подбор свечи 3 раза в день.' },
]

export function OnboardingPage() {
  const [slide, setSlide] = useState(0)
  const navigate = useNavigate()
  const isLast = slide === SLIDES.length - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
      padding: '60px 24px 40px', color: 'var(--tg-theme-text-color)', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>{SLIDES[slide].emoji}</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 16 }}>{SLIDES[slide].title}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--tg-theme-hint-color)',
          maxWidth: 300, margin: 0 }}>{SLIDES[slide].body}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            width: i === slide ? 20 : 6, height: 6, borderRadius: 3,
            background: i === slide ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
            transition: 'width 0.2s',
          }} />
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

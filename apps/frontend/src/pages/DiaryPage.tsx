import { useNavigate } from 'react-router-dom'
import { useTier } from '../hooks/useTier'

export function DiaryPage() {
  const navigate = useNavigate()
  const { isMaster } = useTier()

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

import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const TIER_NAMES: Record<string, string> = {
  free: 'Свеча 🕯 (бесплатно)',
  practitioner: 'Практик 🔥',
  master: 'Мастер ✨',
  annual: 'Годовой 🌙',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  return (
    <div style={{ padding: '24px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Профиль</h1>

      <div style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
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
    </div>
  )
}

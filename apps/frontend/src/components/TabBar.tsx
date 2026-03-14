import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/lunar',   label: 'Луна',      icon: '🌙' },
  { path: '/pick',    label: 'Подбор',    icon: '🕯' },
  { path: '/library', label: 'Книга',     icon: '📖' },
  { path: '/diary',   label: 'Дневник',   icon: '✍️' },
  { path: '/profile', label: 'Профиль',   icon: '👤' },
]

export function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={{
      display: 'flex',
      borderTop: '0.5px solid var(--tg-theme-hint-color)',
      background: 'var(--tg-theme-bg-color)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const active = pathname.startsWith(tab.path)
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '8px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
              fontSize: 10,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

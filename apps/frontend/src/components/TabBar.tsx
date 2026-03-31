import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTier } from '../hooks/useTier'

const BASE_TABS = [
  { path: '/lunar',   label: 'Луна',    icon: '🌙' },
  { path: '/pick',    label: 'Подбор',  icon: '🕯' },
  { path: '/library', label: 'Книга',   icon: '📖' },
  { path: '/diary',   label: 'Дневник', icon: '✍️' },
  { path: '/profile', label: 'Профиль', icon: '👤' },
]

const ASSISTANT_TAB = { path: '/assistant', label: 'Советник', icon: '🔮' }
const ADMIN_TAB     = { path: '/admin',     label: 'Панель',   icon: '⚙️' }

export function TabBar() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const user         = useAuthStore(s => s.user)
  const { isPractitioner } = useTier()

  // Базовые + Советник (Практик+) + Панель (Админ)
  let tabs = [...BASE_TABS]
  if (isPractitioner) {
    // Вставляем Советника перед Профилем
    tabs.splice(tabs.length - 1, 0, ASSISTANT_TAB)
  }
  if (user?.isAdmin) tabs.push(ADMIN_TAB)

  return (
    <nav style={{
      display: 'flex',
      borderTop: '0.5px solid var(--tg-theme-hint-color)',
      background: 'var(--tg-theme-bg-color)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
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
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: tabs.length > 5 ? 18 : 20 }}>{tab.icon}</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', paddingInline: 2 }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

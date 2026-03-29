import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useApi } from '../hooks/useTier'

const TIER_NAMES: Record<string, { label: string; emoji: string; desc: string }> = {
  free:         { label: 'Свеча',   emoji: '🕯', desc: 'История, 13 цветов, подбор 3/день' },
  practitioner: { label: 'Практик', emoji: '🔥', desc: 'Масла, камни, луна, ритуалы' },
  master:       { label: 'Мастер',  emoji: '✨', desc: 'Все материалы, дневник, ИИ' },
  annual:       { label: 'Годовой', emoji: '🌙', desc: 'Как Мастер + ранний доступ' },
}

export function ProfilePage() {
  const navigate  = useNavigate()
  const api       = useApi()
  const user       = useAuthStore(s => s.user)
  const updateTier = useAuthStore(s => s.updateTier)
  const logout     = useAuthStore(s => s.logout)

  const [code,    setCode]    = useState('')
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const info = TIER_NAMES[user?.tier ?? 'free']

  async function handleActivate() {
    if (!code.trim()) return
    setStatus('loading')
    setMessage('')
    try {
      const res = await api.post<{ ok: boolean; tier: string; message: string }>(
        '/access/activate',
        { code: code.trim().toUpperCase() }
      )
      updateTier(res.tier as any)
      setStatus('success')
      setMessage(res.message)
      setCode('')
    } catch (err: any) {
      setStatus('error')
      setMessage(
        err.code === 'CODE_NOT_FOUND'    ? 'Код не найден. Проверьте правильность ввода.' :
        err.code === 'CODE_ALREADY_USED' ? 'Этот код уже был использован.' :
        err.code === 'CODE_EXPIRED'      ? 'Срок действия кода истёк.' :
        err.code === 'TIER_NOT_UPGRADED' ? 'Ваш текущий тариф уже выше или равен этому коду.' :
        'Ошибка активации. Попробуйте позже.'
      )
    }
  }

  const s = (style: object) => style  // helper для читаемости

  return (
    <div style={{ padding: '24px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Профиль</h1>

      {/* Текущий тариф */}
      <div style={s({
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 12, padding: 16, marginBottom: 20,
      })}>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>
          Текущий тариф
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{info.emoji}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{info.label}</div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
              {info.desc}
            </div>
          </div>
        </div>
      </div>

      {/* Активация кода доступа */}
      <div style={s({
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 12, padding: 16, marginBottom: 20,
      })}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
          🔑 Код доступа
        </div>
        <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 14, lineHeight: 1.5 }}>
          Если у вас есть код доступа — введите его здесь чтобы открыть материалы.
        </p>

        <input
          value={code}
          onChange={e => {
            setCode(e.target.value.toUpperCase())
            setStatus('idle')
            setMessage('')
          }}
          placeholder="XXXX-XXXX-XXXX"
          maxLength={14}
          style={s({
            width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 16,
            fontFamily: 'monospace', letterSpacing: 2, textAlign: 'center',
            border: `1px solid ${
              status === 'error'   ? 'var(--tg-theme-destructive-text-color, #e53935)' :
              status === 'success' ? '#4CAF50' :
              'var(--tg-theme-hint-color)'
            }`,
            background: 'var(--tg-theme-bg-color)',
            color: 'var(--tg-theme-text-color)',
            boxSizing: 'border-box' as const,
            outline: 'none',
          })}
        />

        {message ? (
          <p style={s({
            fontSize: 13, marginTop: 10, lineHeight: 1.5,
            color: status === 'success'
              ? '#4CAF50'
              : 'var(--tg-theme-destructive-text-color, #e53935)',
          })}>
            {message}
          </p>
        ) : null}

        <button
          onClick={handleActivate}
          disabled={!code.trim() || status === 'loading'}
          style={s({
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            marginTop: 14, fontSize: 15, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit',
            background: code.trim() ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-button-text-color)',
            opacity: status === 'loading' ? 0.7 : 1,
          })}
        >
          {status === 'loading' ? 'Проверяю...' : 'Активировать'}
        </button>
      </div>

      {/* Кнопки */}
      {user?.tier === 'free' && (
        <button onClick={() => navigate('/paywall')} style={s({
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
          fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          marginBottom: 12,
        })}>
          Оформить подписку
        </button>
      )}

      <button
        onClick={() => { logout(); window.location.reload() }}
        style={s({
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'transparent',
          color: 'var(--tg-theme-destructive-text-color, #e53935)',
          fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          marginTop: 4,
        })}
      >
        Сбросить сессию
      </button>
    </div>
  )
}

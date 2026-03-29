import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useTier'
import { useAuthStore } from '../store/authStore'

type Tier = 'practitioner' | 'master'
type Tab  = 'create' | 'list' | 'stats'

interface Code {
  code:      string
  tier:      Tier
  label:     string | null
  createdAt: string
  expiresAt: string | null
  usedAt:    string | null
  usedBy:    string | null
}

interface Stats {
  users: { tier: string; count: number }[]
  codes: { total: number; used: number; available: number }
}

const TIER_LABEL: Record<Tier, string> = {
  practitioner: '🔥 Практик',
  master:       '✨ Мастер',
}

const TIER_COLOR: Record<Tier, string> = {
  practitioner: '#e67e22',
  master:       '#8e44ad',
}

export function AdminPage() {
  const user = useAuthStore(s => s.user)
  const api  = useApi()
  const [tab, setTab] = useState<Tab>('create')

  if (!user?.isAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '60vh', color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
        Нет доступа
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 100, color: 'var(--tg-theme-text-color)' }}>
      {/* Шапка */}
      <div style={{ padding: '20px 16px 0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>⚙️ Панель управления</h1>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
          Только для администраторов
        </p>

        {/* Табы */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['create', 'list', 'stats'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
              background: tab === t ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: tab === t ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t === 'create' ? '➕ Создать' : t === 'list' ? '📋 Коды' : '📊 Статы'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'create' && <CreateTab api={api} />}
      {tab === 'list'   && <ListTab api={api} />}
      {tab === 'stats'  && <StatsTab api={api} />}
    </div>
  )
}

// ── Вкладка создания ──────────────────────────────────────────────────────────
function CreateTab({ api }: { api: ReturnType<typeof useApi> }) {
  const [tier, setTier]   = useState<Tier>('practitioner')
  const [label, setLabel] = useState('')
  const [count, setCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<string[] | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [copied, setCopied]   = useState<string | null>(null)

  async function handleCreate() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      if (count === 1) {
        const data = await api.post<Code>('/panel/codes', { tier, label: label || undefined })
        setResult([data.code])
      } else {
        const data = await api.post<{ codes: string[] }>('/panel/codes/batch', {
          tier, count, label: label || undefined,
        })
        setResult(data.codes)
      }
      setLabel('')
    } catch (e: any) {
      setError(e.message ?? 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function copyAll() {
    if (!result) return
    navigator.clipboard.writeText(result.join('\n'))
    setCopied('all')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Тариф */}
      <Label>Уровень доступа</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['practitioner', 'master'] as Tier[]).map(t => (
          <button key={t} onClick={() => setTier(t)} style={{
            flex: 1, padding: '12px 0', borderRadius: 10, border: `2px solid ${tier === t ? TIER_COLOR[t] : 'transparent'}`,
            background: tier === t
              ? `${TIER_COLOR[t]}22`
              : 'var(--tg-theme-secondary-bg-color)',
            color: tier === t ? TIER_COLOR[t] : 'var(--tg-theme-hint-color)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            {TIER_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Пометка */}
      <Label>Пометка (необязательно)</Label>
      <input
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Например: Для Марии"
        style={inputStyle}
      />

      {/* Количество */}
      <Label>Количество кодов</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setCount(c => Math.max(1, c - 1))} style={counterBtn}>−</button>
        <span style={{ fontSize: 20, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{count}</span>
        <button onClick={() => setCount(c => Math.min(50, c + 1))} style={counterBtn}>+</button>
        <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginLeft: 4 }}>
          {count > 1 ? `${count} кодов` : 'один код'}
        </span>
      </div>

      {/* Кнопка */}
      <button onClick={handleCreate} disabled={loading} style={{
        width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
        background: loading ? 'var(--tg-theme-hint-color)' : 'var(--tg-theme-button-color)',
        color: 'var(--tg-theme-button-text-color)',
        fontSize: 16, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'inherit', marginBottom: 20,
      }}>
        {loading ? 'Создаю...' : count > 1 ? `Создать ${count} кода` : 'Создать код'}
      </button>

      {/* Ошибка */}
      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 16,
          background: '#ff3b3022', color: '#ff3b30', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Результат */}
      {result && (
        <div style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {result.length === 1 ? 'Код создан ✅' : `Создано ${result.length} кодов ✅`}
            </span>
            {result.length > 1 && (
              <button onClick={copyAll} style={ghostBtn}>
                {copied === 'all' ? 'Скопировано!' : 'Копировать все'}
              </button>
            )}
          </div>

          {result.map(code => (
            <div key={code} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: 8, marginBottom: 8,
              background: 'var(--tg-theme-bg-color)',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
                letterSpacing: 1, color: TIER_COLOR[tier] }}>
                {code}
              </span>
              <button onClick={() => copy(code)} style={ghostBtn}>
                {copied === code ? '✓' : 'Копировать'}
              </button>
            </div>
          ))}

          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
            Передай код пользователю. Он вводит его в разделе Профиль.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Вкладка списка кодов ──────────────────────────────────────────────────────
function ListTab({ api }: { api: ReturnType<typeof useApi> }) {
  const [codes, setCodes]     = useState<Code[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'available' | 'used'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const used = filter === 'all' ? undefined : filter === 'used' ? 'true' : 'false'
      const params = used ? `?used=${used}` : ''
      const data = await api.get<Code[]>(`/panel/codes${params}`)
      setCodes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function handleDelete(code: string) {
    setDeleting(code)
    try {
      await api.delete(`/panel/codes/${code}`)
      setCodes(prev => prev.filter(c => c.code !== code))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const filtered = codes.filter(c => {
    if (filter === 'available') return !c.usedAt
    if (filter === 'used') return !!c.usedAt
    return true
  })

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Фильтр */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['all', 'available', 'used'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
            background: filter === f ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
            color: filter === f ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-hint-color)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {f === 'all' ? 'Все' : f === 'available' ? 'Свободные' : 'Использованные'}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
          Загрузка...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
          Кодов нет
        </div>
      )}

      {filtered.map(code => (
        <div key={code.code} style={{
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 10,
          opacity: code.usedAt ? 0.6 : 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontFamily: 'monospace', fontSize: 15, fontWeight: 700,
                letterSpacing: 1, color: TIER_COLOR[code.tier], marginBottom: 4,
              }}>
                {code.code}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                {TIER_LABEL[code.tier]}
                {code.label && ` · ${code.label}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
                {code.usedAt
                  ? `✅ Использован ${new Date(code.usedAt).toLocaleDateString('ru')}`
                  : `Создан ${new Date(code.createdAt).toLocaleDateString('ru')}`}
              </div>
            </div>
            {!code.usedAt && (
              <button
                onClick={() => handleDelete(code.code)}
                disabled={deleting === code.code}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none',
                  background: '#ff3b3022', color: '#ff3b30',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {deleting === code.code ? '...' : 'Удалить'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Вкладка статистики ────────────────────────────────────────────────────────
function StatsTab({ api }: { api: ReturnType<typeof useApi> }) {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Stats>('/panel/stats')
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const TIER_NAMES: Record<string, string> = {
    free: '🆓 Бесплатный', practitioner: '🔥 Практик',
    master: '✨ Мастер', annual: '🌟 Годовой',
  }
  const totalUsers = stats?.users.reduce((s, r) => s + r.count, 0) ?? 0

  return (
    <div style={{ padding: '0 16px' }}>
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
          Загрузка...
        </div>
      )}

      {stats && (
        <>
          {/* Пользователи */}
          <div style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              Пользователи · всего {totalUsers}
            </div>
            {stats.users.map(row => {
              const pct = totalUsers ? Math.round(row.count / totalUsers * 100) : 0
              return (
                <div key={row.tier} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{TIER_NAMES[row.tier] ?? row.tier}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{row.count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--tg-theme-bg-color)' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: 'var(--tg-theme-button-color)',
                      width: `${pct}%`, transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Коды */}
          <div style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              Коды доступа
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Всего', value: stats.codes.total, color: 'var(--tg-theme-text-color)' },
                { label: 'Использовано', value: stats.codes.used, color: '#e67e22' },
                { label: 'Свободно', value: stats.codes.available, color: '#27ae60' },
              ].map(item => (
                <div key={item.label} style={{
                  flex: 1, background: 'var(--tg-theme-bg-color)', borderRadius: 10,
                  padding: '12px 0', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Стили ─────────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tg-theme-hint-color)',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none',
  background: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)',
  fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16,
  outline: 'none',
}

const counterBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10, border: 'none',
  background: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)',
  fontSize: 22, cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}

const ghostBtn: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 8, border: 'none',
  background: 'none', color: 'var(--tg-theme-button-color)',
  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
}

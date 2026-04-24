import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi, useTier } from '../hooks/useTier'
import { useAuthStore } from '../store/authStore'

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface UsageInfo {
  used:  number
  limit: number
}

// ─── Пресеты вопросов ─────────────────────────────────────────────────────────

const PRESETS: { tier: string; label: string; prompt: string }[] = [
  { tier: 'all',          label: '🕯 Какую свечу выбрать?',      prompt: 'Помоги мне выбрать свечу. Расскажи, что у тебя на душе — чего хочешь достичь или от чего освободиться.' },
  { tier: 'all',          label: '🌙 Что делать в эту фазу?',    prompt: 'Расскажи мне о текущей лунной фазе и что лучше всего делать со свечами прямо сейчас.' },
  { tier: 'practitioner', label: '🌿 Какое масло подойдёт?',     prompt: 'Помоги подобрать масло для свечи. Скажи мне о своём намерении.' },
  { tier: 'practitioner', label: '💎 Камень к моей свече?',       prompt: 'Какой кристалл лучше всего дополнит мою практику? Расскажи о своей ситуации.' },
  { tier: 'master',       label: '🔥 Составь мне ритуал',        prompt: 'Составь для меня персональный ритуал со свечой. Скажи мне: какова цель и что сейчас происходит в твоей жизни?' },
  { tier: 'master',       label: '🪄 Объясни знак пламени',       prompt: 'Помоги прочитать знак пламени или отливки. Опиши, что ты видишь.' },
  { tier: 'master',       label: '👨‍👩‍👧 Родовая практика',           prompt: 'Хочу начать работу с родовыми свечами. Помоги мне разобраться с чего начать.' },
]

// ─── Лимиты по тарифу ─────────────────────────────────────────────────────────

const TIER_LIMITS: Record<string, number> = {
  free: 0, practitioner: 5, master: 15, annual: 30,
}

const TIER_LABEL: Record<string, string> = {
  practitioner: 'Практик 🔥', master: 'Мастер ✨', annual: 'Годовой 🌙',
}

// ─── Заглушка free ────────────────────────────────────────────────────────────

function LockedScreen() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--tg-theme-text-color)' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🔮</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>ИИ-помощник</h2>
      <p style={{
        color: 'var(--tg-theme-hint-color)', marginBottom: 8,
        lineHeight: 1.7, fontSize: 14,
      }}>
        Личный советник по свечной магии: поможет выбрать свечу,
        составить ритуал, объяснить знак пламени, подобрать масла и камни.
      </p>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        margin: '20px 0 28px', textAlign: 'left',
      }}>
        {['🔥 Практик — 5 вопросов в день', '✨ Мастер — 15 вопросов в день', '🌙 Годовой — 30 вопросов в день'].map(f => (
          <div key={f} style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--tg-theme-secondary-bg-color)',
            fontSize: 13, color: 'var(--tg-theme-text-color)',
          }}>{f}</div>
        ))}
      </div>
      <button onClick={() => navigate('/paywall')} style={{
        padding: '13px 36px', borderRadius: 12, border: 'none',
        background: '#7b2d8b', color: '#fff',
        fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Открыть доступ
      </button>
    </div>
  )
}

// ─── Сообщение ────────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 16, background: '#7b2d8b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, marginRight: 8, flexShrink: 0, marginTop: 4,
        }}>
          🔮
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? '#7b2d8b' : 'var(--tg-theme-secondary-bg-color)',
        color: isUser ? '#fff' : 'var(--tg-theme-text-color)',
        fontSize: 14, lineHeight: 1.65,
        whiteSpace: 'pre-wrap' as const,
      }}>
        {msg.content}
      </div>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function AssistantPage() {
  const { tier }    = useTier()
  const api         = useApi()
  const navigate    = useNavigate()
  const user        = useAuthStore(s => s.user)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [usage,     setUsage]     = useState<UsageInfo | null>(null)
  const [error,     setError]     = useState('')

  // Админ имеет доступ независимо от тарифа
  const isAdmin = user?.isAdmin ?? false
  const limit = isAdmin ? 999 : (TIER_LIMITS[tier] ?? 0)
  if (limit === 0 && !isAdmin) return <LockedScreen />

  // Загрузить usage при маунте
  useEffect(() => {
    api.get<UsageInfo>('/assistant/usage')
      .then(u => setUsage(u))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const remainingText = usage
    ? `${usage.limit - usage.used} из ${usage.limit} вопросов сегодня`
    : '...'

  const canSend = !loading && input.trim().length > 0 && (!usage || usage.used < usage.limit)

  async function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q) return
    setError('')
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const resp = await api.post<{ answer: string; usage: UsageInfo }>(
        '/assistant/ask',
        { messages: newMessages },
      )
      setMessages(prev => [...prev, { role: 'assistant', content: resp.answer }])
      setUsage(resp.usage)
    } catch (e: any) {
      if (e.code === 'LIMIT_REACHED') {
        setError('Лимит вопросов на сегодня исчерпан. Возвращайтесь завтра.')
      } else if (e.code === 'TIER_REQUIRED') {
        navigate('/paywall')
      } else {
        setError('Ошибка. Попробуйте ещё раз.')
      }
      // Убрать последнее сообщение пользователя при ошибке
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }

  const availablePresets = PRESETS.filter(p =>
    isAdmin ||
    p.tier === 'all' ||
    (p.tier === 'practitioner' && (tier === 'practitioner' || tier === 'master' || tier === 'annual')) ||
    (p.tier === 'master' && (tier === 'master' || tier === 'annual'))
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      color: 'var(--tg-theme-text-color)',
    }}>

      {/* Шапка */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '0.5px solid var(--tg-theme-secondary-bg-color)',
        background: 'var(--tg-theme-bg-color)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>🔮 Помощник</div>
            <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
              {isAdmin ? 'Администратор' : (TIER_LABEL[tier] ?? tier)} · {remainingText}
            </div>
          </div>
          {usage && !isAdmin && (
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: 'var(--tg-theme-secondary-bg-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#7b2d8b',
            }}>
              {usage.limit - usage.used}
            </div>
          )}
        </div>
      </div>

      {/* Чат */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 8px' }}>

        {/* Приветствие + пресеты */}
        {messages.length === 0 && (
          <div>
            <div style={{
              padding: '16px', borderRadius: 12, marginBottom: 20,
              background: 'var(--tg-theme-secondary-bg-color)',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>🔮</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    Привет{user?.firstName ? `, ${user.firstName}` : ''}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.6 }}>
                    Я знаю всё о свечной магии: помогу выбрать свечу, составить ритуал, объяснить знак пламени или подобрать союзников. Спросите что угодно.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tg-theme-hint-color)',
              textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
              Быстрые вопросы
            </div>
            {availablePresets.map(p => (
              <button key={p.label} onClick={() => send(p.prompt)} style={{
                width: '100%', textAlign: 'left', padding: '11px 14px',
                borderRadius: 10, border: '1px solid var(--tg-theme-secondary-bg-color)',
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)', fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8,
              }}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Сообщения */}
        {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}

        {/* Индикатор загрузки */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 16, background: '#7b2d8b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🔮</div>
            <div style={{
              padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--tg-theme-secondary-bg-color)',
              fontSize: 14, color: 'var(--tg-theme-hint-color)',
            }}>
              {'● ● ●'}
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: '#FFEBEE', color: '#C62828', fontSize: 13, lineHeight: 1.5,
          }}>
            {error}
            {usage && usage.used >= usage.limit && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => navigate('/paywall')} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: '#7b2d8b', color: '#fff',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Увеличить лимит
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Ввод */}
      <div style={{
        padding: '10px 12px 16px',
        borderTop: '0.5px solid var(--tg-theme-secondary-bg-color)',
        background: 'var(--tg-theme-bg-color)',
        flexShrink: 0,
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} style={{
            background: 'none', border: 'none', fontSize: 12,
            color: 'var(--tg-theme-hint-color)', cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 8, padding: 0,
          }}>
            ↺ Новый разговор
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            rows={1}
            placeholder={usage && usage.used >= usage.limit
              ? 'Лимит на сегодня исчерпан'
              : 'Спросите о свечах...'
            }
            disabled={loading || (!!usage && usage.used >= usage.limit)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 20,
              border: '1px solid var(--tg-theme-secondary-bg-color)',
              background: 'var(--tg-theme-secondary-bg-color)',
              color: 'var(--tg-theme-text-color)', fontSize: 16,
              resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
              outline: 'none', maxHeight: 120, overflowY: 'auto',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!canSend}
            style={{
              width: 40, height: 40, borderRadius: 20, border: 'none',
              background: canSend ? '#7b2d8b' : 'var(--tg-theme-secondary-bg-color)',
              color: canSend ? '#fff' : 'var(--tg-theme-hint-color)',
              fontSize: 18, cursor: canSend ? 'pointer' : 'default',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

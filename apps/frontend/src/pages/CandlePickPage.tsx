import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useApi, useTier } from '../hooks/useTier'
import { BackHeader } from '../components/BackHeader'

const INTENTIONS = [
  'Любовь', 'Деньги', 'Защита', 'Здоровье', 'Карьера',
  'Очищение', 'Удача', 'Духовность', 'Творчество', 'Мир в доме',
  'Самолюбовь', 'Страсть', 'Интуиция', 'Заземление', 'Сны',
  'Успех', 'Завершение', 'Отпускание', 'Учёба', 'Предки',
]

const MOON_EMOJI: Record<string, string> = {
  new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖',
  last_quarter: '🌗', waning_crescent: '🌘',
}

interface PickResult {
  color:        string
  oil:          string
  stone:        string
  moonPhase:    string
  moonPhaseRu:  string
  phaseWarning: string | null
  usedToday:    number
  dailyLimit:   number | null
}

// ─── Экран подбора ────────────────────────────────────────────────────────────

export function CandlePickPage() {
  const [intention, setIntention] = useState('')
  const [result,    setResult]    = useState<PickResult | null>(null)
  const api      = useApi()
  const navigate = useNavigate()
  const { isFree } = useTier()

  const { mutate, isPending, error } = useMutation({
    mutationFn: (int: string) => api.post<PickResult>('/candle/pick', { intention: int }),
    onSuccess:  setResult,
    onError:    (err: any) => {
      console.error('Candle pick error:', err)
      if (err.code === 'PAYMENT_REQUIRED') navigate('/paywall')
    },
  })

  if (result) {
    return (
      <ResultScreen
        result={result}
        onReset={() => setResult(null)}
        isFree={isFree}
      />
    )
  }

  const canSubmit = intention.trim() && !isPending

  return (
    <div style={{ color: 'var(--tg-theme-text-color)' }}>
      <BackHeader title="Подбор свечи" to="/lunar" />

      <div style={{ padding: '8px 16px 100px' }}>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
          Выберите намерение или опишите своё — получите свечу, масло и камень
        </p>

        {/* Сетка намерений */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {INTENTIONS.map(item => (
            <button
              key={item}
              onClick={() => setIntention(intention === item ? '' : item)}
              style={{
                padding:    '7px 14px',
                borderRadius: 20,
                border:     `1px solid ${intention === item
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-hint-color)'}`,
                background: intention === item ? 'var(--tg-theme-button-color)' : 'none',
                color:      intention === item
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Произвольный текст */}
        <textarea
          value={intention}
          onChange={e => setIntention(e.target.value)}
          placeholder="Или опишите своими словами: «хочу привлечь клиентов», «отпустить обиду»..."
          style={{
            width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 10,
            border: '1px solid var(--tg-theme-hint-color)',
            background: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)', fontSize: 16,
            fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
            lineHeight: 1.5,
          }}
        />

        {error && (
          <p style={{ fontSize: 12, color: '#ff4444', margin: '6px 0 0' }}>
            Ошибка: {(error as any).message || 'Не удалось подобрать свечу'}
          </p>
        )}

        {isFree && !error && (
          <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '6px 0 0' }}>
            Бесплатно: 3 подбора в день
          </p>
        )}

        <button
          onClick={() => {
            const trimmed = intention.trim()
            if (trimmed) {
              console.log('Submitting intention:', trimmed)
              mutate(trimmed)
            }
          }}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', marginTop: 16,
            background: canSubmit ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-button-text-color)', fontSize: 16, fontWeight: 500,
            cursor: canSubmit ? 'pointer' : 'default', fontFamily: 'inherit',
          }}
        >
          {isPending ? '🕯 Подбираю...' : 'Подобрать свечу'}
        </button>
      </div>
    </div>
  )
}

// ─── Экран результата ─────────────────────────────────────────────────────────

function ResultScreen({
  result, onReset, isFree,
}: {
  result: PickResult; onReset: () => void; isFree: boolean
}) {
  const navigate = useNavigate()

  const moonEmoji = MOON_EMOJI[result.moonPhase] ?? '🌙'

  return (
    <div style={{ color: 'var(--tg-theme-text-color)' }}>
      <BackHeader title="Ваша свеча" onBack={onReset} />

      <div style={{ padding: '8px 16px 100px' }}>

        {/* Предупреждение о фазе (если есть) */}
        {result.phaseWarning && (
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            background: '#FFF3CD', borderLeft: '4px solid #D4AF37',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7A5C00',
              textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
              ⏳ Совет по времени
            </div>
            <div style={{ fontSize: 13, color: '#7A5C00', lineHeight: 1.6 }}>
              {result.phaseWarning}
            </div>
          </div>
        )}

        {/* Карточка результата */}
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: 14, overflow: 'hidden', marginBottom: 20,
        }}>
          {[
            { emoji: '🕯', label: 'Цвет свечи',   value: result.color },
            { emoji: '🌿', label: 'Масло',         value: result.oil },
            { emoji: '💎', label: 'Камень',        value: result.stone },
            {
              emoji: moonEmoji,
              label: 'Фаза Луны',
              value: result.moonPhaseRu,
              hint: result.moonPhase === 'full_moon'
                ? 'Время благодарности и завершения'
                : result.moonPhase === 'new_moon'
                ? 'Время посева намерений'
                : undefined,
            },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px',
                borderBottom: i < arr.length - 1
                  ? '0.5px solid rgba(0,0,0,0.06)'
                  : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 2 }}>
                  {row.emoji} {row.label}
                </div>
                {row.hint && (
                  <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                    {row.hint}
                  </div>
                )}
              </div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Счётчик free */}
        {isFree && result.dailyLimit && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 4,
            marginBottom: 20,
          }}>
            {Array.from({ length: result.dailyLimit }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                background: i < result.usedToday
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-hint-color)',
                opacity: i < result.usedToday ? 1 : 0.3,
              }} />
            ))}
          </div>
        )}

        {/* Кнопки действий */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onReset}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Новый подбор
          </button>

          <button
            onClick={() => navigate('/library/16')}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              border: '1.5px solid var(--tg-theme-button-color)',
              background: 'none', color: 'var(--tg-theme-button-color)',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            📖 Открыть универсальный ритуал
          </button>

          {isFree && (
            <button
              onClick={() => navigate('/paywall')}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10,
                border: 'none', background: 'transparent',
                color: 'var(--tg-theme-hint-color)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Безлимитный подбор — тариф Практик
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

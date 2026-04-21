import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi, useTier } from '../hooks/useTier'

// ─── Типы ────────────────────────────────────────────────────────────────────

interface DiaryEntry {
  id:          string
  entryDate:   string
  intention:   string
  candleColor: string | null
  oils:        string | null
  moonPhase:   string | null
  result:      string | null
  createdAt:   string
}

type View = 'list' | 'new' | 'detail'

// ─── Константы ────────────────────────────────────────────────────────────────

const CANDLE_COLORS = [
  { value: 'Белая',      emoji: '🤍' },
  { value: 'Чёрная',     emoji: '🖤' },
  { value: 'Красная',    emoji: '❤️' },
  { value: 'Розовая',    emoji: '🌸' },
  { value: 'Зелёная',    emoji: '💚' },
  { value: 'Золотая',    emoji: '✨' },
  { value: 'Жёлтая',     emoji: '💛' },
  { value: 'Оранжевая',  emoji: '🧡' },
  { value: 'Синяя',      emoji: '💙' },
  { value: 'Фиолетовая', emoji: '💜' },
  { value: 'Коричневая', emoji: '🤎' },
  { value: 'Серебряная', emoji: '🩶' },
]

const MOON_PHASES = [
  { value: 'new_moon',        label: '🌑 Новолуние' },
  { value: 'waxing_crescent', label: '🌒 Растущий серп' },
  { value: 'first_quarter',   label: '🌓 Первая четверть' },
  { value: 'waxing_gibbous',  label: '🌔 Растущая Луна' },
  { value: 'full_moon',       label: '🌕 Полнолуние' },
  { value: 'waning_gibbous',  label: '🌖 Убывающая Луна' },
  { value: 'last_quarter',    label: '🌗 Последняя четверть' },
  { value: 'waning_crescent', label: '🌘 Убывающий серп' },
]

const MOON_EMOJI: Record<string, string> = {
  new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖',
  last_quarter: '🌗', waning_crescent: '🌘',
}

// ─── Вспомогательные ─────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ─── Экран-заглушка (free) ────────────────────────────────────────────────────

function LockedScreen() {
  const navigate = useNavigate()
  return (
    <div style={{
      padding: '60px 24px', textAlign: 'center',
      color: 'var(--tg-theme-text-color)',
    }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>✍️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Дневник практик</h2>
      <p style={{
        color: 'var(--tg-theme-hint-color)', marginBottom: 28,
        lineHeight: 1.6, fontSize: 14,
      }}>
        Записывайте каждый ритуал — намерение, свечу, фазу луны и результат.
        Через 3 месяца увидите свои паттерны: что работает именно для вас.
      </p>
      <p style={{
        fontSize: 12, color: 'var(--tg-theme-hint-color)',
        marginBottom: 24, opacity: 0.7,
      }}>
        Доступно на тарифе Мастер ✨
      </p>
      <button onClick={() => navigate('/paywall')} style={{
        padding: '13px 36px', borderRadius: 12, border: 'none',
        background: '#7b2d8b', color: '#fff',
        fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Открыть Мастер
      </button>
    </div>
  )
}

// ─── Форма новой записи ───────────────────────────────────────────────────────

interface NewEntryFormProps {
  onSave: (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => void
  onCancel: () => void
  saving: boolean
}

function NewEntryForm({ onSave, onCancel, saving }: NewEntryFormProps) {
  const [date,        setDate]        = useState(todayISO())
  const [intention,   setIntention]   = useState('')
  const [candleColor, setCandleColor] = useState('')
  const [oils,        setOils]        = useState('')
  const [moonPhase,   setMoonPhase]   = useState('')
  const [result,      setResult]      = useState('')
  const [step,        setStep]        = useState(0)

  const steps = [
    { label: 'Дата и намерение', valid: intention.trim().length > 3 },
    { label: 'Инструменты',      valid: true },
    { label: 'Результат',        valid: true },
  ]

  function handleSubmit() {
    onSave({ entryDate: date, intention, candleColor: candleColor || null,
      oils: oils || null, moonPhase: moonPhase || null, result: result || null })
  }

  const s = (style: object) => style

  return (
    <div style={{ padding: '16px 16px 100px' }}>

      {/* Навигация */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', color: 'var(--tg-theme-button-color)',
          fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
        }}>← Назад</button>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
          {step + 1} / {steps.length}
        </div>
      </div>

      {/* Прогресс */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? '#D4AF37' : 'var(--tg-theme-secondary-bg-color)',
          }} />
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
        {step === 0 && '📅 Намерение'}
        {step === 1 && '🕯 Инструменты'}
        {step === 2 && '✍️ Результат'}
      </h2>

      {/* Шаг 0: Дата + намерение */}
      {step === 0 && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Дата ритуала
            </label>
            <input
              type="date" value={date}
              onChange={e => setDate(e.target.value)}
              style={s({
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 16,
                border: '1px solid var(--tg-theme-hint-color)',
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)', boxSizing: 'border-box' as const,
              })}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Намерение
            </label>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginBottom: 8, lineHeight: 1.5 }}>
              Запишите в настоящем времени: «Я привлекаю...», «Я отпускаю...»
            </div>
            <textarea
              value={intention}
              onChange={e => setIntention(e.target.value)}
              rows={4}
              placeholder="Я открыта к финансовому потоку и принимаю изобилие с благодарностью"
              style={s({
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 16,
                border: '1px solid var(--tg-theme-hint-color)', resize: 'none' as const,
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)', boxSizing: 'border-box' as const,
                lineHeight: 1.6, fontFamily: 'inherit',
              })}
            />
            <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', textAlign: 'right' as const, marginTop: 4 }}>
              {intention.length}/500
            </div>
          </div>
        </div>
      )}

      {/* Шаг 1: Инструменты */}
      {step === 1 && (
        <div>
          {/* Цвет свечи */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>
              Цвет свечи
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {CANDLE_COLORS.map(c => (
                <button key={c.value} onClick={() => setCandleColor(c.value === candleColor ? '' : c.value)}
                  style={s({
                    padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13,
                    background: candleColor === c.value ? '#D4AF37' : 'var(--tg-theme-secondary-bg-color)',
                    color: candleColor === c.value ? '#fff' : 'var(--tg-theme-text-color)',
                    fontWeight: candleColor === c.value ? 600 : 400,
                  })}>
                  {c.emoji} {c.value}
                </button>
              ))}
            </div>
          </div>

          {/* Фаза луны */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>
              Фаза Луны
            </label>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {MOON_PHASES.map(p => (
                <button key={p.value} onClick={() => setMoonPhase(p.value === moonPhase ? '' : p.value)}
                  style={s({
                    padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    textAlign: 'left' as const, fontFamily: 'inherit', fontSize: 14,
                    background: moonPhase === p.value ? '#D4AF37' : 'var(--tg-theme-secondary-bg-color)',
                    color: moonPhase === p.value ? '#fff' : 'var(--tg-theme-text-color)',
                    fontWeight: moonPhase === p.value ? 600 : 400,
                  })}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Масла */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Масла и травы (необязательно)
            </label>
            <input
              value={oils}
              onChange={e => setOils(e.target.value)}
              placeholder="Роза, пачули, базилик..."
              style={s({
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                border: '1px solid var(--tg-theme-hint-color)',
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)', boxSizing: 'border-box' as const,
                fontFamily: 'inherit',
              })}
            />
          </div>
        </div>
      )}

      {/* Шаг 2: Результат */}
      {step === 2 && (
        <div>
          <div style={{
            padding: '12px 16px', background: '#FFF8DC',
            borderRadius: 10, marginBottom: 20, fontSize: 13,
            color: '#7A5C00', lineHeight: 1.6,
          }}>
            💡 Заполните сейчас или вернитесь позже — после того, как намерение начнёт проявляться
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Что произошло / наблюдения
            </label>
            <textarea
              value={result}
              onChange={e => setResult(e.target.value)}
              rows={5}
              placeholder="Через 3 дня получила предложение о новом проекте. Пламя горело ровно — знак принятого намерения."
              style={s({
                width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 16,
                border: '1px solid var(--tg-theme-hint-color)', resize: 'none' as const,
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)', boxSizing: 'border-box' as const,
                lineHeight: 1.6, fontFamily: 'inherit',
              })}
            />
          </div>
        </div>
      )}

      {/* Кнопки навигации по шагам */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, padding: '12px 0', borderRadius: 10,
            border: '1.5px solid var(--tg-theme-hint-color)',
            background: 'transparent', color: 'var(--tg-theme-text-color)',
            fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Назад
          </button>
        )}

        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!steps[step].valid}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
              background: steps[step].valid ? '#D4AF37' : 'var(--tg-theme-hint-color)',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: steps[step].valid ? 'pointer' : 'default', fontFamily: 'inherit',
            }}>
            Далее →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving || !intention.trim()} style={{
            flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
            background: '#7b2d8b', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Сохраняю...' : '✦ Сохранить запись'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Детальный просмотр записи ────────────────────────────────────────────────

interface EntryDetailProps {
  entry: DiaryEntry
  onBack: () => void
  onDelete: (id: string) => void
  deleting: boolean
}

function EntryDetail({ entry, onBack, onDelete, deleting }: EntryDetailProps) {
  const [confirm, setConfirm] = useState(false)
  const colorObj = CANDLE_COLORS.find(c => c.value === entry.candleColor)

  return (
    <div style={{ padding: '16px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: 'var(--tg-theme-button-color)',
        fontSize: 15, cursor: 'pointer', padding: '0 0 20px', fontFamily: 'inherit',
      }}>← Назад</button>

      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>
        {entry.moonPhase && MOON_EMOJI[entry.moonPhase] + ' '}
        {formatDate(entry.entryDate)}
      </div>

      {/* Намерение */}
      <div style={{
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 12, padding: 16, marginBottom: 14, marginTop: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#D4AF37',
          textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
          ✦ Намерение
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>{entry.intention}</p>
      </div>

      {/* Инструменты */}
      {(entry.candleColor || entry.moonPhase || entry.oils) && (
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: 12, padding: 16, marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tg-theme-hint-color)',
            textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
            Инструменты
          </div>
          {entry.candleColor && (
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              🕯 {colorObj?.emoji ?? ''} {entry.candleColor}
            </div>
          )}
          {entry.moonPhase && (
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              {MOON_EMOJI[entry.moonPhase]} {MOON_PHASES.find(p => p.value === entry.moonPhase)?.label.split(' ').slice(1).join(' ')}
            </div>
          )}
          {entry.oils && (
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
              🌿 {entry.oils}
            </div>
          )}
        </div>
      )}

      {/* Результат */}
      {entry.result ? (
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: 12, padding: 16, marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#388E3C',
            textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
            ✿ Результат
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, color: 'var(--tg-theme-text-color)' }}>
            {entry.result}
          </p>
        </div>
      ) : (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 24,
          border: '1px dashed var(--tg-theme-hint-color)',
          fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.5,
        }}>
          Результат ещё не записан — вернитесь, когда намерение начнёт проявляться
        </div>
      )}

      {/* Удаление */}
      {!confirm ? (
        <button onClick={() => setConfirm(true)} style={{
          width: '100%', padding: '10px 0', background: 'none', border: 'none',
          color: 'var(--tg-theme-destructive-text-color, #e53935)',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Удалить запись
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setConfirm(false)} style={{
            flex: 1, padding: '11px 0', borderRadius: 10,
            border: '1.5px solid var(--tg-theme-hint-color)',
            background: 'transparent', color: 'var(--tg-theme-text-color)',
            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>Отмена</button>
          <button onClick={() => onDelete(entry.id)} disabled={deleting} style={{
            flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
            background: '#e53935', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {deleting ? '...' : 'Удалить'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Список записей ───────────────────────────────────────────────────────────

interface EntryListProps {
  entries: DiaryEntry[]
  onNew: () => void
  onSelect: (e: DiaryEntry) => void
}

function EntryList({ entries, onNew, onSelect }: EntryListProps) {
  // Статистика
  const colorCounts: Record<string, number> = {}
  entries.forEach(e => { if (e.candleColor) colorCounts[e.candleColor] = (colorCounts[e.candleColor] ?? 0) + 1 })
  const topColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]
  const withResult = entries.filter(e => e.result).length

  return (
    <div style={{ padding: '16px 16px 100px', color: 'var(--tg-theme-text-color)' }}>

      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>✍️ Дневник</h1>
        <button onClick={onNew} style={{
          padding: '8px 16px', borderRadius: 20, border: 'none',
          background: '#7b2d8b', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Запись
        </button>
      </div>

      {/* Статистика */}
      {entries.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8, marginBottom: 24,
        }}>
          {[
            { label: 'Ритуалов', value: entries.length },
            { label: 'С результатом', value: withResult },
            { label: 'Любимый цвет', value: topColor ? CANDLE_COLORS.find(c => c.value === topColor[0])?.emoji ?? '—' : '—' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--tg-theme-secondary-bg-color)',
              borderRadius: 10, padding: '12px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'var(--tg-theme-hint-color)', lineHeight: 1.3 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Здесь будут ваши ритуалы.{'\n'}Первая запись — самая важная.
          </p>
          <button onClick={onNew} style={{
            padding: '13px 32px', borderRadius: 12, border: 'none',
            background: '#7b2d8b', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Записать первый ритуал
          </button>
        </div>
      )}

      {/* Список */}
      {entries.map(entry => {
        const colorObj = CANDLE_COLORS.find(c => c.value === entry.candleColor)
        return (
          <div key={entry.id} onClick={() => onSelect(entry)} style={{
            background: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>
                  {entry.moonPhase && MOON_EMOJI[entry.moonPhase] + ' '}
                  {formatDate(entry.entryDate)}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 500, marginBottom: 6,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                }}>
                  {entry.intention}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {entry.candleColor && (
                    <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                      {colorObj?.emoji} {entry.candleColor}
                    </span>
                  )}
                  {entry.result && (
                    <span style={{ fontSize: 12, color: '#388E3C' }}>✓ Есть результат</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)', marginLeft: 8, flexShrink: 0 }}>›</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function DiaryPage() {
  const { isMaster } = useTier()
  const api          = useApi()
  const qc           = useQueryClient()
  const [view,    setView]    = useState<View>('list')
  const [selected, setSelected] = useState<DiaryEntry | null>(null)

  if (!isMaster) return <LockedScreen />

  const { data, isLoading } = useQuery<{ entries: DiaryEntry[] }>({
    queryKey: ['diary'],
    queryFn:  () => api.get('/diary'),
  })

  const saveMutation = useMutation({
    mutationFn: (body: object) => api.post<DiaryEntry>('/diary', body),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['diary'] }); setView('list') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/diary/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['diary'] }); setView('list') },
  })

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Загрузка...</span>
    </div>
  )

  if (view === 'new') return (
    <NewEntryForm
      onSave={body => saveMutation.mutate(body)}
      onCancel={() => setView('list')}
      saving={saveMutation.isPending}
    />
  )

  if (view === 'detail' && selected) return (
    <EntryDetail
      entry={selected}
      onBack={() => setView('list')}
      onDelete={id => deleteMutation.mutate(id)}
      deleting={deleteMutation.isPending}
    />
  )

  return (
    <EntryList
      entries={data?.entries ?? []}
      onNew={() => setView('new')}
      onSelect={e => { setSelected(e); setView('detail') }}
    />
  )
}

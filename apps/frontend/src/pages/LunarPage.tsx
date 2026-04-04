import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useTier'

interface LunarData {
  phase:          string
  phaseRu:        string
  illumination:   number
  daysUntilFull:  number
  tip:            string
  recommendations: { candles: string[]; intentions: string[] }
}

const PHASE_EMOJI: Record<string, string> = {
  new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖',
  last_quarter: '🌗', waning_crescent: '🌘',
}

// Иконки и цвета для намерений из онбординга
const INTENT_META: Record<string, { emoji: string; label: string; candle: string }> = {
  money:  { emoji: '💚', label: 'Деньги',  candle: 'Зелёная' },
  love:   { emoji: '🌸', label: 'Любовь',  candle: 'Розовая' },
  health: { emoji: '💙', label: 'Здоровье', candle: 'Синяя' },
  career: { emoji: '✨', label: 'Карьера', candle: 'Золотая' },
  peace:  { emoji: '🤍', label: 'Мир',     candle: 'Белая' },
}

export function LunarPage() {
  const api      = useApi()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<LunarData>({
    queryKey: ['lunar-today'],
    queryFn:  () => api.get('/lunar/today'),
    staleTime: 60 * 60 * 1000,
  })

  // Читаем ответ из онбординга
  const savedIntent = localStorage.getItem('onboarding_intent')
  const intentMeta  = savedIntent ? INTENT_META[savedIntent] : null

  if (isLoading) return <PageLoader />
  if (!data)     return <ErrorScreen />

  const emoji          = PHASE_EMOJI[data.phase] ?? '🌙'
  const illuminationPct = Math.round(data.illumination * 100)

  // Определяем энергию фазы для подсказки пользователю
  const phaseEnergy: Record<string, string> = {
    new_moon:        'Посев намерений',
    waxing_crescent: 'Начало действий',
    first_quarter:   'Преодоление',
    waxing_gibbous:  'Притяжение',
    full_moon:       'Кульминация',
    waning_gibbous:  'Отпускание',
    last_quarter:    'Прощение',
    waning_crescent: 'Покой',
  }

  const isGrowingPhase = ['waxing_crescent', 'first_quarter', 'waxing_gibbous'].includes(data.phase)
  const isWaningPhase  = ['waning_gibbous', 'last_quarter', 'waning_crescent'].includes(data.phase)

  // Предупреждение о несовместимости намерения из теста и текущей фазы
  const attractiveIntents = ['money', 'love', 'career']
  const releasingIntents  = ['peace']

  let intentWarning: string | null = null
  if (savedIntent && isWaningPhase && attractiveIntents.includes(savedIntent)) {
    intentWarning = `Для «${intentMeta?.label}» лучше растущая фаза. Сейчас — время отпускать.`
  } else if (savedIntent && isGrowingPhase && releasingIntents.includes(savedIntent)) {
    intentWarning = `Для очищения и мира лучше убывающая фаза. Сейчас — время привлекать.`
  }

  return (
    <div style={{ padding: '20px 16px 100px', color: 'var(--tg-theme-text-color)' }}>

      {/* Фаза */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          fontSize: 80, lineHeight: 1, marginBottom: 10,
          filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.4))',
        }}>
          {emoji}
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700 }}>
          {data.phaseRu}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 12,
            background: 'var(--tg-theme-secondary-bg-color)',
            fontSize: 12, color: 'var(--tg-theme-hint-color)',
          }}>
            {illuminationPct}% освещённость
          </span>
          <span style={{
            padding: '3px 10px', borderRadius: 12,
            background: 'var(--tg-theme-secondary-bg-color)',
            fontSize: 12, color: 'var(--tg-theme-hint-color)',
          }}>
            {data.daysUntilFull === 0 ? 'Полнолуние сегодня' : `${data.daysUntilFull} дн. до полнолуния`}
          </span>
        </div>
      </div>

      {/* Персональный блок (если есть ответ из онбординга) */}
      {intentMeta && (
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tg-theme-hint-color)',
            textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
            {intentMeta.emoji} Ваш запрос: {intentMeta.label}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                Свеча: {intentMeta.candle}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 3 }}>
                {phaseEnergy[data.phase]} — {intentWarning
                  ? 'не лучший момент'
                  : 'подходящий момент'}
              </div>
            </div>
            <button
              onClick={() => navigate('/pick')}
              style={{
                padding: '7px 14px', borderRadius: 20, border: 'none',
                background: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Подобрать →
            </button>
          </div>
          {intentWarning && (
            <div style={{
              marginTop: 10, padding: '8px 10px', borderRadius: 8,
              background: '#FFF8DC', fontSize: 12, color: '#7A5C00', lineHeight: 1.5,
            }}>
              ⏳ {intentWarning}
            </div>
          )}
        </div>
      )}

      {/* Совет дня */}
      <div style={{
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#D4AF37',
          textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          ✦ Совет дня
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{data.tip}</p>
      </div>

      {/* Рекомендации */}
      <Section title="Свечи сегодня">
        <TagRow items={data.recommendations.candles} onClick={() => navigate('/pick')} />
      </Section>

      <Section title="Намерения для практики">
        <TagRow items={data.recommendations.intentions} onClick={() => navigate('/pick')} />
      </Section>

      {/* CTA */}
      <button
        onClick={() => navigate('/pick')}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          marginTop: 8,
        }}
      >
        🕯 Подобрать свечу на сегодня
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{
        margin: '0 0 10px', fontSize: 12, fontWeight: 600,
        color: 'var(--tg-theme-hint-color)',
        textTransform: 'uppercase', letterSpacing: 0.6,
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function TagRow({ items, onClick }: { items: string[]; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <button
          key={item}
          onClick={onClick}
          style={{
            padding: '7px 14px', borderRadius: 20,
            border: '1.5px solid var(--tg-theme-hint-color)',
            background: 'none', color: 'var(--tg-theme-text-color)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '60vh', gap: 12, color: 'var(--tg-theme-hint-color)' }}>
      <span style={{ fontSize: 36 }}>🌙</span>
      <span style={{ fontSize: 14 }}>Загрузка...</span>
    </div>
  )
}

function ErrorScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '60vh', padding: 24, textAlign: 'center',
      color: 'var(--tg-theme-text-color)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🌙</div>
      <p style={{ fontSize: 15, marginBottom: 8, fontWeight: 600 }}>Нет связи с сервером</p>
      <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 24, maxWidth: 260, lineHeight: 1.5 }}>
        Сервер просыпается — подождите немного и обновите страницу
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '10px 28px', borderRadius: 10, border: 'none',
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 14, cursor: 'pointer',
        }}
      >
        Обновить
      </button>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useTier'

interface LunarData {
  phase: string
  phaseRu: string
  illumination: number
  daysUntilFull: number
  tip: string
  recommendations: { candles: string[]; intentions: string[] }
}

const PHASE_EMOJI: Record<string, string> = {
  new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖',
  last_quarter: '🌗', waning_crescent: '🌘',
}

export function LunarPage() {
  const api = useApi()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery<LunarData>({
    queryKey: ['lunar-today'],
    queryFn: () => api.get('/lunar/today'),
    staleTime: 60 * 60 * 1000, // 1 час
  })

  if (isLoading) return <PageLoader />

  const emoji = PHASE_EMOJI[data!.phase] ?? '🌙'
  const illuminationPct = Math.round(data!.illumination * 100)

  return (
    <div style={{ padding: '24px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      {/* Фаза */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 10 }}>{emoji}</div>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600 }}>{data!.phaseRu}</h1>
        <p style={{ margin: 0, color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
          Освещённость {illuminationPct}% · до полнолуния {data!.daysUntilFull} дн.
        </p>
      </div>

      {/* Совет дня */}
      <div style={{
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 20
      }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{data!.tip}</p>
      </div>

      {/* Рекомендации */}
      <Section title="Свечи сегодня">
        <TagRow items={data!.recommendations.candles} onClick={() => navigate('/pick')} />
      </Section>

      <Section title="Намерения">
        <TagRow items={data!.recommendations.intentions} onClick={() => navigate('/pick')} />
      </Section>

      {/* CTA подбора */}
      <button
        onClick={() => navigate('/pick')}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
          fontSize: 16, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
        }}
      >
        Подобрать свечу на сегодня
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500,
        color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</h3>
      {children}
    </div>
  )
}

function TagRow({ items, onClick }: { items: string[]; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <button key={item} onClick={onClick} style={{
          padding: '6px 14px', borderRadius: 20,
          border: '1px solid var(--tg-theme-hint-color)',
          background: 'none', color: 'var(--tg-theme-text-color)',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>{item}</button>
      ))}
    </div>
  )
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '60vh', color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
      Загрузка...
    </div>
  )
}

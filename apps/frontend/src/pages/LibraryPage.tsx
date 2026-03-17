import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../hooks/useTier'

interface Chapter {
  id: number
  title: string
  part: number
  tier: string
  available: boolean
  preview: string
  body?: string
}

const PART_TITLES: Record<number, string> = {
  1: 'История и философия',
  2: 'Символика свечи',
  3: 'Природные союзники',
  4: 'Лунная магия',
  5: 'Подготовка и ритуал',
  6: 'Практики',
  7: 'Изготовление',
}

const TIER_LABEL: Record<string, string> = {
  practitioner: 'Практик и выше',
  master: 'Мастер и выше',
}

export function LibraryPage() {
  const api = useApi()
  const navigate = useNavigate()
  const { id } = useParams()

  const { data } = useQuery<{ chapters: Chapter[] }>({
    queryKey: ['chapters'],
    queryFn: () => api.get('/content/chapters'),
  })

  if (id) return <ChapterView id={id} />

  const chapters = data?.chapters ?? []
  const parts = [...new Set(chapters.map(c => c.part))].sort((a, b) => a - b)

  return (
    <div style={{ padding: '16px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Библиотека</h1>
      {parts.map(part => (
        <div key={part} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 12, fontWeight: 500, color: 'var(--tg-theme-hint-color)',
            textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>
            Часть {part} — {PART_TITLES[part]}
          </h3>
          {chapters.filter(c => c.part === part).map(ch => (
            <div
              key={ch.id}
              onClick={() => ch.available ? navigate(`/library/${ch.id}`) : navigate('/paywall')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10, marginBottom: 6,
                background: 'var(--tg-theme-secondary-bg-color)',
                cursor: 'pointer', opacity: ch.available ? 1 : 0.55,
              }}
            >
              <span style={{ fontSize: 18 }}>{ch.available ? '📖' : '🔒'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.title}
                </div>
                {!ch.available && (
                  <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                    {TIER_LABEL[ch.tier] ?? ch.tier}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)', flexShrink: 0 }}>›</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ChapterView({ id }: { id: string }) {
  const api = useApi()
  const navigate = useNavigate()

  const { data, error, isLoading } = useQuery<{ chapter: Chapter }>({
    queryKey: ['chapter', id],
    queryFn: () => api.get(`/content/chapters/${id}`),
    retry: false,
  })

  if ((error as any)?.code === 'TIER_REQUIRED') {
    navigate('/paywall')
    return null
  }

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '60vh', color: 'var(--tg-theme-hint-color)' }}>
        Загрузка...
      </div>
    )
  }

  const chapter = data.chapter
  // Разбиваем body на абзацы по переносу строки
  const paragraphs = (chapter.body ?? chapter.preview).split('\n').filter(p => p.trim())

  return (
    <div style={{ padding: '16px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <button onClick={() => navigate('/library')} style={{
        background: 'none', border: 'none', color: 'var(--tg-theme-button-color)',
        fontSize: 15, cursor: 'pointer', padding: '0 0 16px', fontFamily: 'inherit',
      }}>← Назад</button>

      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, lineHeight: 1.3 }}>
        {chapter.title}
      </h1>

      {paragraphs.map((p, i) => (
        <p key={i} style={{
          fontSize: 15, lineHeight: 1.75, marginBottom: 16,
          color: 'var(--tg-theme-text-color)',
        }}>
          {p}
        </p>
      ))}
    </div>
  )
}

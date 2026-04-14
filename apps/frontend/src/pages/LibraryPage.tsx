import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../hooks/useTier'
import { ChapterRenderer } from '../components/ChapterRenderer'
import type { ChapterSection } from '../components/ChapterRenderer'

interface Chapter {
  id:            number
  title:         string
  part:          number
  tier:          string
  available:     boolean
  preview:       string
  emoji?:        string
  read_time_min?: number
  body?:         string
  sections?:     ChapterSection[]
  terms?:        Record<string, string>
  related?:      number[]
}

const PART_TITLES: Record<number, { label: string; emoji: string }> = {
  1: { label: 'История и философия',  emoji: '🕯' },
  2: { label: 'Символика свечи',       emoji: '🎨' },
  3: { label: 'Природные союзники',    emoji: '🌿' },
  4: { label: 'Лунная магия',          emoji: '🌙' },
  5: { label: 'Подготовка и ритуал',   emoji: '✨' },
  6: { label: 'Практики',              emoji: '🔥' },
  7: { label: 'Изготовление',          emoji: '🪔' },
}

const TIER_LABEL: Record<string, string> = {
  practitioner: 'Практик и выше',
  master:       'Мастер и выше',
}

// ─── Список глав ─────────────────────────────────────────────────────────────

export function LibraryPage() {
  const api      = useApi()
  const navigate = useNavigate()
  const { id }   = useParams()

  const { data, isLoading, isError, refetch } = useQuery<{ chapters: Chapter[] }>({
    queryKey: ['chapters'],
    queryFn:  () => api.get('/content/chapters'),
    retry:    2,
    staleTime: 5 * 60 * 1000,
  })

  if (id) return <ChapterView id={id} />

  // ── Загрузка ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '70vh', gap: 14,
        color: 'var(--tg-theme-hint-color)',
      }}>
        <span style={{ fontSize: 36 }}>📖</span>
        <span style={{ fontSize: 14 }}>Загружаю библиотеку...</span>
      </div>
    )
  }

  // ── Ошибка загрузки ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '70vh', gap: 14, padding: '0 24px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 36 }}>🕯</span>
        <p style={{ fontSize: 15, color: 'var(--tg-theme-text-color)' }}>
          Не удалось загрузить библиотеку
        </p>
        <button
          onClick={() => refetch()}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  const chapters = data?.chapters ?? []
  const parts    = [...new Set(chapters.map(c => c.part))].sort((a, b) => a - b)

  return (
    <div style={{ padding: '16px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Библиотека</h1>
      <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 24 }}>
        {chapters.filter(c => c.available).length} из {chapters.length} глав доступно
      </p>

      {parts.map(part => {
        const meta = PART_TITLES[part] ?? { label: `Часть ${part}`, emoji: '📖' }
        return (
          <div key={part} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{meta.emoji}</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--tg-theme-hint-color)',
                textTransform: 'uppercase', letterSpacing: 0.6,
              }}>
                Часть {part} — {meta.label}
              </span>
            </div>

            {chapters.filter(c => c.part === part).map(ch => (
              <div
                key={ch.id}
                onClick={() => ch.available ? navigate(`/library/${ch.id}`) : navigate('/paywall')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, marginBottom: 6,
                  background: 'var(--tg-theme-secondary-bg-color)',
                  cursor: 'pointer', opacity: ch.available ? 1 : 0.55,
                }}
              >
                <span style={{ fontSize: ch.emoji ? 20 : 18, flexShrink: 0 }}>
                  {ch.emoji ?? (ch.available ? '📖' : '🔒')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ch.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                    {ch.read_time_min && ch.available && (
                      <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>
                        ⏱ {ch.read_time_min} мин
                      </span>
                    )}
                    {!ch.available && (
                      <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>
                        🔒 {TIER_LABEL[ch.tier] ?? ch.tier}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)', flexShrink: 0 }}>›</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Просмотр главы ──────────────────────────────────────────────────────────

function ChapterView({ id }: { id: string }) {
  const api      = useApi()
  const navigate = useNavigate()

  const { data, error, isLoading } = useQuery<{ chapter: Chapter }>({
    queryKey: ['chapter', id],
    queryFn:  () => api.get(`/content/chapters/${id}`),
    retry:    false,
  })

  if ((error as any)?.code === 'TIER_REQUIRED' || (error as any)?.status === 403) {
    navigate('/paywall')
    return null
  }

  if (isLoading || !data) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        height: '60vh', gap: 12, color: 'var(--tg-theme-hint-color)',
      }}>
        <span style={{ fontSize: 32 }}>🕯</span>
        <span style={{ fontSize: 14 }}>Загрузка...</span>
      </div>
    )
  }

  const ch = data.chapter
  const hasStructured = Array.isArray(ch.sections) && ch.sections.length > 0
  const paragraphs = hasStructured
    ? []
    : (ch.body ?? ch.preview).split('\n').filter((p: string) => p.trim())

  return (
    <div style={{ padding: '16px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <button
        onClick={() => navigate('/library')}
        style={{
          background: 'none', border: 'none',
          color: 'var(--tg-theme-button-color)',
          fontSize: 15, cursor: 'pointer',
          padding: '0 0 20px', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        ← Библиотека
      </button>

      <div style={{ marginBottom: 24 }}>
        {ch.emoji && <div style={{ fontSize: 36, marginBottom: 10 }}>{ch.emoji}</div>}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
          {ch.title}
        </h1>
        {ch.read_time_min && (
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
            ⏱ Время чтения: ~{ch.read_time_min} минут
          </div>
        )}
      </div>

      {hasStructured ? (
        <ChapterRenderer sections={ch.sections!} terms={ch.terms} />
      ) : (
        paragraphs.map((p: string, i: number) => (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
            {p}
          </p>
        ))
      )}

      {ch.related && ch.related.length > 0 && (
        <RelatedChapters ids={ch.related} currentId={Number(id)} />
      )}
    </div>
  )
}

// ─── Связанные главы ─────────────────────────────────────────────────────────

function RelatedChapters({ ids, currentId }: { ids: number[]; currentId: number }) {
  const api      = useApi()
  const navigate = useNavigate()

  const { data } = useQuery<{ chapters: Chapter[] }>({
    queryKey: ['chapters'],
    queryFn:  () => api.get('/content/chapters'),
  })

  const chapters = (data?.chapters ?? []).filter(
    c => ids.includes(c.id) && c.id !== currentId
  )

  if (chapters.length === 0) return null

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: 'var(--tg-theme-hint-color)',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
      }}>
        Читайте также
      </div>
      {chapters.map(ch => (
        <div
          key={ch.id}
          onClick={() => ch.available ? navigate(`/library/${ch.id}`) : navigate('/paywall')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10, marginBottom: 6,
            background: 'var(--tg-theme-secondary-bg-color)',
            cursor: 'pointer', opacity: ch.available ? 1 : 0.5,
          }}
        >
          <span style={{ fontSize: 18 }}>{ch.emoji ?? '📖'}</span>
          <span style={{ fontSize: 14, flex: 1 }}>{ch.title}</span>
          <span style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>›</span>
        </div>
      ))}
    </div>
  )
}

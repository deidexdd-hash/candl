import { useState } from 'react'

// ─── Типы ───────────────────────────────────────────────────────────────────

export type HighlightColor = 'gold' | 'purple' | 'green' | 'red' | 'blue' | 'neutral'

export interface ChapterSection {
  type:
    | 'heading'
    | 'text'
    | 'tip'
    | 'warning'
    | 'quote'
    | 'term'
    | 'visual'
    | 'list'
    | 'ritual_steps'
    | 'table_inline'
    | 'divider'
    | 'fact'
  level?: 1 | 2 | 3
  content?: string
  items?: string[]
  highlight?: HighlightColor
  visual_svg?: string      // SVG-строка напрямую
  caption?: string
  term?: string
  definition?: string
  headers?: string[]
  rows?: string[][]
}

// ─── Цветовая система ───────────────────────────────────────────────────────

const COLORS: Record<HighlightColor, { bg: string; border: string; text: string; icon: string }> = {
  gold:    { bg: '#FFF8DC', border: '#D4AF37', text: '#7A5C00', icon: '✦' },
  purple:  { bg: '#F5F0FF', border: '#7B2D8B', text: '#4A0072', icon: '◈' },
  green:   { bg: '#F0F7F0', border: '#388E3C', text: '#1B5E20', icon: '✿' },
  red:     { bg: '#FFF0F0', border: '#C62828', text: '#7F0000', icon: '⚠' },
  blue:    { bg: '#EFF5FF', border: '#1565C0', text: '#0D47A1', icon: 'ℹ' },
  neutral: { bg: 'var(--tg-theme-secondary-bg-color)', border: 'var(--tg-theme-hint-color)', text: 'var(--tg-theme-text-color)', icon: '•' },
}

// ─── Вспомогательный рендер текста с выделением [[термин]] ──────────────────

function RichText({ text, terms }: { text: string; terms?: Record<string, string> }) {
  if (!terms || Object.keys(terms).length === 0) {
    return <>{text}</>
  }

  const parts: (string | { term: string; def: string })[] = []
  let remaining = text

  // Ищем [[термин]] паттерны
  const pattern = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const termKey = match[1]
    parts.push({ term: termKey, def: terms[termKey] ?? '' })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  if (parts.length === 0) return <>{text}</>

  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <TermInline key={i} term={part.term} definition={part.def} />
        )
      )}
    </>
  )
}

// ─── Термин с тултипом ──────────────────────────────────────────────────────

function TermInline({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span
        onClick={() => setOpen(v => !v)}
        style={{
          color: '#7B2D8B',
          borderBottom: '1px dashed #7B2D8B',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        {term}
      </span>
      {open && (
        <span style={{
          display: 'block',
          margin: '8px 0',
          padding: '10px 14px',
          background: '#F5F0FF',
          borderLeft: '3px solid #7B2D8B',
          borderRadius: '0 8px 8px 0',
          fontSize: 13,
          lineHeight: 1.6,
          color: '#4A0072',
        }}>
          <strong>{term}</strong> — {definition}
        </span>
      )}
    </>
  )
}

// ─── Отдельная карточка термина (тип 'term') ────────────────────────────────

function TermCard({ section, terms }: { section: ChapterSection; terms?: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 20,
          background: '#F5F0FF',
          border: '1px solid #7B2D8B',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          color: '#7B2D8B',
        }}
      >
        <span>◈</span>
        <span>{section.term}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{
          marginTop: 8,
          padding: '12px 16px',
          background: '#F5F0FF',
          borderRadius: 10,
          fontSize: 13,
          lineHeight: 1.7,
          color: '#4A0072',
        }}>
          {section.content && (
            <p style={{ margin: '0 0 8px', fontStyle: 'italic' }}>
              <RichText text={section.content} terms={terms} />
            </p>
          )}
          {section.definition && (
            <p style={{ margin: 0 }}>
              <strong>Определение:</strong> {section.definition}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Разделы ────────────────────────────────────────────────────────────────

function SectionHeading({ section }: { section: ChapterSection }) {
  const level = section.level ?? 2
  const sizes = { 1: 20, 2: 17, 3: 15 }
  const weights = { 1: 700, 2: 600, 3: 600 }
  const margins = { 1: '28px 0 12px', 2: '24px 0 10px', 3: '18px 0 8px' }
  const colors = {
    1: 'var(--tg-theme-text-color)',
    2: 'var(--tg-theme-text-color)',
    3: 'var(--tg-theme-hint-color)',
  }

  return (
    <div style={{
      fontSize: sizes[level],
      fontWeight: weights[level],
      margin: margins[level],
      color: colors[level],
      lineHeight: 1.3,
      ...(level === 2 ? {
        paddingLeft: 12,
        borderLeft: '3px solid #D4AF37',
      } : {}),
      ...(level === 3 ? {
        textTransform: 'uppercase' as const,
        letterSpacing: 0.8,
        fontSize: 11,
      } : {}),
    }}>
      {section.content}
    </div>
  )
}

function SectionText({ section, terms }: { section: ChapterSection; terms?: Record<string, string> }) {
  return (
    <p style={{
      fontSize: 15,
      lineHeight: 1.8,
      marginBottom: 14,
      color: 'var(--tg-theme-text-color)',
    }}>
      <RichText text={section.content ?? ''} terms={terms} />
    </p>
  )
}

function SectionHighlightBlock({ section, terms }: { section: ChapterSection; terms?: Record<string, string> }) {
  const color = COLORS[section.highlight ?? 'neutral']
  const typeIcons: Record<string, string> = {
    tip: '💡',
    warning: '⚠️',
    fact: '📌',
  }
  const typeLabels: Record<string, string> = {
    tip: 'Совет',
    warning: 'Внимание',
    fact: 'Факт',
  }

  return (
    <div style={{
      margin: '16px 0',
      padding: '14px 16px',
      background: color.bg,
      borderLeft: `4px solid ${color.border}`,
      borderRadius: '0 10px 10px 0',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: color.border,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.8,
        marginBottom: 6,
      }}>
        {typeIcons[section.type] ?? color.icon} {typeLabels[section.type] ?? section.type}
      </div>
      <div style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: color.text,
      }}>
        <RichText text={section.content ?? ''} terms={terms} />
      </div>
    </div>
  )
}

function SectionQuote({ section }: { section: ChapterSection }) {
  return (
    <blockquote style={{
      margin: '20px 0',
      padding: '16px 20px',
      background: 'var(--tg-theme-secondary-bg-color)',
      borderRadius: 12,
      position: 'relative' as const,
    }}>
      <div style={{
        fontSize: 40,
        color: '#D4AF37',
        lineHeight: 1,
        marginBottom: 4,
        fontFamily: 'Georgia, serif',
      }}>
        «
      </div>
      <p style={{
        fontSize: 15,
        lineHeight: 1.8,
        fontStyle: 'italic',
        color: 'var(--tg-theme-text-color)',
        margin: 0,
      }}>
        {section.content}
      </p>
    </blockquote>
  )
}

function SectionList({ section, terms }: { section: ChapterSection; terms?: Record<string, string> }) {
  return (
    <ul style={{ margin: '0 0 16px', padding: '0 0 0 4px', listStyle: 'none' }}>
      {(section.items ?? []).map((item, i) => (
        <li key={i} style={{
          display: 'flex',
          gap: 10,
          marginBottom: 8,
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--tg-theme-text-color)',
        }}>
          <span style={{ color: '#D4AF37', flexShrink: 0, marginTop: 2 }}>•</span>
          <span><RichText text={item} terms={terms} /></span>
        </li>
      ))}
    </ul>
  )
}

function SectionRitualSteps({ section, terms }: { section: ChapterSection; terms?: Record<string, string> }) {
  return (
    <div style={{ margin: '16px 0' }}>
      {section.content && (
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--tg-theme-hint-color)',
          textTransform: 'uppercase' as const,
          letterSpacing: 0.8,
          marginBottom: 12,
        }}>
          {section.content}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {(section.items ?? []).map((step, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            padding: '12px 14px',
            background: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: 10,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: '#D4AF37',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--tg-theme-text-color)', paddingTop: 4 }}>
              <RichText text={step} terms={terms} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionTableInline({ section }: { section: ChapterSection }) {
  const headers = section.headers ?? []
  const rows = section.rows ?? []

  return (
    <div style={{ margin: '16px 0', overflowX: 'auto' as const }}>
      {section.content && (
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--tg-theme-hint-color)',
          textTransform: 'uppercase' as const,
          letterSpacing: 0.8,
          marginBottom: 8,
        }}>
          {section.content}
        </div>
      )}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: 13,
      }}>
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{
                  padding: '8px 10px',
                  textAlign: 'left' as const,
                  background: '#D4AF37',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: i === 0 ? '8px 0 0 0' : i === headers.length - 1 ? '0 8px 0 0' : 0,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{
              background: ri % 2 === 0 ? 'var(--tg-theme-secondary-bg-color)' : 'transparent',
            }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  lineHeight: 1.5,
                  color: 'var(--tg-theme-text-color)',
                  fontWeight: ci === 0 ? 500 : 400,
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionVisual({ section }: { section: ChapterSection }) {
  if (!section.visual_svg) return null

  // Strip any hardcoded background from the SVG root so our container controls it
  const cleanSvg = section.visual_svg.replace(
    /(<svg[^>]*?)background:[^;'"]+;?/g,
    '$1'
  )

  return (
    <div style={{ margin: '20px 0' }}>
      <div
        style={{
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--tg-theme-secondary-bg-color, #f5f0e8)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
        }}
        dangerouslySetInnerHTML={{ __html: cleanSvg }}
      />
      {section.caption && (
        <div style={{
          textAlign: 'center' as const,
          fontSize: 12,
          color: 'var(--tg-theme-hint-color)',
          marginTop: 8,
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          {section.caption}
        </div>
      )}
    </div>
  )
}

function SectionDivider() {
  return (
    <div style={{
      margin: '24px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--tg-theme-hint-color)', opacity: 0.2 }} />
      <span style={{ fontSize: 16, opacity: 0.4 }}>✦</span>
      <div style={{ flex: 1, height: 1, background: 'var(--tg-theme-hint-color)', opacity: 0.2 }} />
    </div>
  )
}

// ─── Главный компонент ──────────────────────────────────────────────────────

interface ChapterRendererProps {
  sections: ChapterSection[]
  terms?: Record<string, string>
}

export function ChapterRenderer({ sections, terms }: ChapterRendererProps) {
  return (
    <div>
      {sections.map((section, i) => {
        switch (section.type) {
          case 'heading':
            return <SectionHeading key={i} section={section} />
          case 'text':
            return <SectionText key={i} section={section} terms={terms} />
          case 'tip':
          case 'warning':
          case 'fact':
            return <SectionHighlightBlock key={i} section={section} terms={terms} />
          case 'quote':
            return <SectionQuote key={i} section={section} />
          case 'term':
            return <TermCard key={i} section={section} terms={terms} />
          case 'list':
            return <SectionList key={i} section={section} terms={terms} />
          case 'ritual_steps':
            return <SectionRitualSteps key={i} section={section} terms={terms} />
          case 'table_inline':
            return <SectionTableInline key={i} section={section} />
          case 'visual':
            return <SectionVisual key={i} section={section} />
          case 'divider':
            return <SectionDivider key={i} />
          default:
            return null
        }
      })}
    </div>
  )
}

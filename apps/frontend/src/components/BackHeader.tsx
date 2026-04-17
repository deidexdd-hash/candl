import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'

interface BackHeaderProps {
  /** Заголовок страницы (необязательно) */
  title?: string
  /** Куда вести. Если не задан — navigate(-1) */
  to?: string
  /** Кастомный обработчик вместо navigate */
  onBack?: () => void
  /** Дополнительный элемент справа (кнопка, иконка) */
  right?: React.ReactNode
}

/**
 * Компонент шапки с кнопкой «Назад».
 * Автоматически показывает/скрывает нативную кнопку назад Telegram.
 * При анмаунте скрывает нативную кнопку.
 */
export function BackHeader({ title, to, onBack, right }: BackHeaderProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack)      { onBack(); return }
    if (to)          { navigate(to); return }
    navigate(-1)
  }

  useEffect(() => {
    // Показываем нативную кнопку Telegram если она доступна
    if (WebApp.BackButton) {
      WebApp.BackButton.show()
      WebApp.BackButton.onClick(handleBack)
    }
    return () => {
      if (WebApp.BackButton) {
        WebApp.BackButton.hide()
        WebApp.BackButton.offClick(handleBack)
      }
    }
  }, [handleBack]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '12px 16px 4px',
      minHeight:      44,
    }}>
      {/* Кнопка назад (UI fallback — видна когда нет нативной кнопки Telegram) */}
      <button
        onClick={handleBack}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        4,
          background: 'none',
          border:     'none',
          color:      'var(--tg-theme-button-color)',
          fontSize:   15,
          cursor:     'pointer',
          padding:    '4px 0',
          fontFamily: 'inherit',
          // Скрываем в Telegram — там есть нативная кнопка
          // Оставляем для web-preview и отладки
          opacity:    WebApp.platform === 'unknown' ? 1 : 1,
          pointerEvents: 'auto',
        }}
        aria-label="Назад"
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span>
        <span>Назад</span>
      </button>

      {/* Заголовок по центру */}
      {title && (
        <div style={{
          position:   'absolute',
          left:       '50%',
          transform:  'translateX(-50%)',
          fontSize:   16,
          fontWeight: 600,
          color:      'var(--tg-theme-text-color)',
          maxWidth:   '60%',
          overflow:   'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {title}
        </div>
      )}

      {/* Правый элемент */}
      <div style={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>
        {right ?? null}
      </div>
    </div>
  )
}

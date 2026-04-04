import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'

// ─── Намерения для теста ──────────────────────────────────────────────────────

const QUIZ_OPTIONS = [
  { key: 'money',    emoji: '💚', label: 'Деньги и достаток',    candle: 'зелёную', color: '#2E7D32' },
  { key: 'love',     emoji: '🌸', label: 'Любовь и отношения',   candle: 'розовую', color: '#C2185B' },
  { key: 'health',   emoji: '💙', label: 'Здоровье и энергия',   candle: 'синюю',   color: '#1565C0' },
  { key: 'career',   emoji: '✨', label: 'Карьера и цели',       candle: 'золотую', color: '#F57F17' },
  { key: 'peace',    emoji: '🤍', label: 'Мир и очищение',       candle: 'белую',   color: '#546E7A' },
]

// Детали рекомендации по ключу
const RECOMMENDATIONS: Record<string, {
  title:    string
  candle:   string
  oil:      string
  stone:    string
  phase:    string
  tip:      string
  chapterId: number
}> = {
  money: {
    title:    'Для достатка и процветания',
    candle:   'Зелёная',
    oil:      'Базилик или пачули',
    stone:    'Авантюрин',
    phase:    'Растущая Луна',
    tip:      'Намерение в настоящем времени: «Деньги приходят ко мне легко из множества источников»',
    chapterId: 17,
  },
  love: {
    title:    'Для любви и отношений',
    candle:   'Розовая',
    oil:      'Роза или жасмин',
    stone:    'Розовый кварц',
    phase:    'Растущая Луна, пятница',
    tip:      'Работайте со своим полем: описывайте ощущения от отношений, а не конкретного человека',
    chapterId: 18,
  },
  health: {
    title:    'Для здоровья и восстановления',
    candle:   'Синяя',
    oil:      'Лаванда или эвкалипт',
    stone:    'Аквамарин',
    phase:    'Убывающая Луна (исцеление), Растущая (восстановление сил)',
    tip:      'Во время ритуала положите ладонь на область, требующую внимания',
    chapterId: 16,
  },
  career: {
    title:    'Для карьеры и достижений',
    candle:   'Золотая',
    oil:      'Имбирь или ладан',
    stone:    'Тигровый глаз',
    phase:    'Растущая Луна, воскресенье',
    tip:      'Держите рядом со свечой предмет, символизирующий вашу цель: визитка, договор, фото',
    chapterId: 16,
  },
  peace: {
    title:    'Для мира и очищения',
    candle:   'Белая',
    oil:      'Шалфей или ладан',
    stone:    'Прозрачный кварц',
    phase:    'Убывающая Луна или новолуние',
    tip:      'Белая свеча универсальна: она очищает пространство и принимает любое намерение',
    chapterId: 19,
  },
}

// ─── Анимированная иконка свечи ───────────────────────────────────────────────

function CandleIcon() {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        fontSize: 72,
        animation: 'none',
        filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.5))',
      }}>
        🕯
      </div>
      {/* Мерцание ореола */}
      <div style={{
        position: 'absolute',
        top: 4, left: '50%',
        transform: 'translateX(-50%)',
        width: 20, height: 20,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 70%)',
        animation: 'flicker 2s ease-in-out infinite',
      }} />
    </div>
  )
}

// ─── Компоненты слайдов ───────────────────────────────────────────────────────

function SlideWelcome() {
  return (
    <div style={{ textAlign: 'center', padding: '0 8px' }}>
      <CandleIcon />
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '20px 0 12px', lineHeight: 1.2 }}>
        Язык Пламени
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--tg-theme-hint-color)', marginBottom: 20 }}>
        Свечная практика — это не суеверие.
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--tg-theme-text-color)', marginBottom: 0 }}>
        Это работа с вниманием, намерением
        и символическим языком, понятным
        подсознанию.
      </p>
    </div>
  )
}

function SlideScience() {
  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ fontSize: 52, textAlign: 'center', marginBottom: 20 }}>🔬</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
        Как это работает
      </h2>
      {[
        {
          icon: '👁',
          title: 'Единственная точка фокуса',
          text: 'Пламя вытесняет шум из поля восприятия и удерживает внимание',
        },
        {
          icon: '🧠',
          title: 'Альфа-волны (8–12 Гц)',
          text: 'Мерцание свечи совпадает с частотой расслабленной концентрации мозга',
        },
        {
          icon: '🎯',
          title: 'Активация намерения',
          text: 'Символ (цвет, аромат, камень) программирует ретикулярную систему мозга',
        },
      ].map(item => (
        <div key={item.title} style={{
          display: 'flex', gap: 14, marginBottom: 16,
          padding: '12px 14px',
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.5 }}>
              {item.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SlideHowItWorks() {
  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ fontSize: 52, textAlign: 'center', marginBottom: 20 }}>🗺️</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
        Три инструмента
      </h2>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 20 }}>
        Приложение построено вокруг трёх основ
      </p>
      {[
        {
          icon: '🌙', color: '#1A237E',
          title: 'Луна — когда работать',
          text: '29-дневный цикл определяет лучшее время для каждого намерения. Растущая — привлекать. Убывающая — отпускать.',
        },
        {
          icon: '🕯', color: '#7A5C00',
          title: 'Свеча — с чем работать',
          text: 'Цвет, масло, камень, форма — система соответствий из тысячелетних традиций.',
        },
        {
          icon: '✍️', color: '#4A0072',
          title: 'Дневник — как отслеживать',
          text: 'Записи создают личный словарь того, что работает именно у вас.',
        },
      ].map(item => (
        <div key={item.title} style={{
          display: 'flex', gap: 14, marginBottom: 14,
          padding: '14px',
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: 12,
          borderLeft: `3px solid ${item.color}`,
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.5 }}>
              {item.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SlideQuiz({ selected, onSelect }: { selected: string; onSelect: (k: string) => void }) {
  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ fontSize: 52, textAlign: 'center', marginBottom: 16 }}>🎯</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
        Что сейчас важнее всего?
      </h2>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 24, lineHeight: 1.5 }}>
        Выберите одно — получите персональную рекомендацию по свече и ритуалу
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {QUIZ_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              border: selected === opt.key
                ? `2px solid ${opt.color}`
                : '1.5px solid var(--tg-theme-hint-color)',
              background: selected === opt.key
                ? 'var(--tg-theme-secondary-bg-color)'
                : 'none',
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.emoji}</span>
            <span style={{
              fontSize: 15,
              fontWeight: selected === opt.key ? 600 : 400,
              color: selected === opt.key ? 'var(--tg-theme-text-color)' : 'var(--tg-theme-text-color)',
            }}>
              {opt.label}
            </span>
            {selected === opt.key && (
              <span style={{ marginLeft: 'auto', color: opt.color, fontSize: 18 }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function SlideRecommendation({ answer }: { answer: string }) {
  const rec = RECOMMENDATIONS[answer]
  if (!rec) return null
  const opt = QUIZ_OPTIONS.find(o => o.key === answer)

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 48 }}>{opt?.emoji}</span>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 12, marginBottom: 4 }}>
          {rec.title}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
          Персональная рекомендация
        </p>
      </div>

      <div style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
        {[
          { icon: '🕯', label: 'Свеча',   value: rec.candle },
          { icon: '🌿', label: 'Масло',   value: rec.oil },
          { icon: '💎', label: 'Камень',  value: rec.stone },
          { icon: '🌙', label: 'Лучшее время', value: rec.phase },
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px',
            borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
              {row.icon} {row.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: '#FFF8DC', borderLeft: '3px solid #D4AF37',
        fontSize: 13, color: '#7A5C00', lineHeight: 1.6,
      }}>
        💡 {rec.tip}
      </div>
    </div>
  )
}

function SlideFreeAccess({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ fontSize: 52, textAlign: 'center', marginBottom: 20 }}>🎁</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
        Что доступно бесплатно
      </h2>

      {[
        '🕯 5 глав — история, философия, цвета, формы, виды воска',
        '🎯 Подбор свечи — 3 запроса в день',
        '🌙 Текущая фаза Луны каждый день',
        '📖 Первые главы каждого раздела',
      ].map(item => (
        <div key={item} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          marginBottom: 10, fontSize: 14, lineHeight: 1.5,
        }}>
          <span>{item}</span>
        </div>
      ))}

      <div style={{
        margin: '20px 0',
        padding: '14px 16px',
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 12,
        fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.6,
      }}>
        Практик и Мастер открывают все 22 главы, ИИ-советника,
        дневник практик и полный лунный календарь.
      </div>

      <button
        onClick={onStart}
        style={{
          width: '100%', padding: '15px 0', borderRadius: 12, border: 'none',
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        🕯 Начать бесплатно
      </button>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate  = useNavigate()
  const [slide,   setSlide]  = useState(0)
  const [answer,  setAnswer] = useState('')

  const TOTAL_SLIDES = 6

  function handleNext() {
    // Слайд теста: нужен ответ
    if (slide === 3 && !answer) return
    if (slide < TOTAL_SLIDES - 1) {
      setSlide(s => s + 1)
    }
  }

  function handleStart() {
    // Сохраняем ответ теста для LunarPage
    if (answer) {
      localStorage.setItem('onboarding_intent', answer)
    }
    localStorage.setItem('onboarding_done', '1')
    navigate('/lunar')
  }

  function handleBack() {
    if (slide > 0) setSlide(s => s - 1)
  }

  const canNext = slide !== 3 || !!answer
  const isLast  = slide === TOTAL_SLIDES - 1

  const slideLabels = ['Привет', 'Наука', 'Как устроено', 'Ваш запрос', 'Рекомендация', 'Доступ']

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      color: 'var(--tg-theme-text-color)',
      boxSizing: 'border-box',
    }}>

      {/* Шапка: прогресс */}
      <div style={{ padding: '16px 20px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= slide ? '#D4AF37' : 'var(--tg-theme-secondary-bg-color)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--tg-theme-hint-color)',
        }}>
          <span>{slideLabels[slide]}</span>
          <span>{slide + 1} / {TOTAL_SLIDES}</span>
        </div>
      </div>

      {/* Контент */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {slide === 0 && <SlideWelcome />}
        {slide === 1 && <SlideScience />}
        {slide === 2 && <SlideHowItWorks />}
        {slide === 3 && <SlideQuiz selected={answer} onSelect={setAnswer} />}
        {slide === 4 && answer && <SlideRecommendation answer={answer} />}
        {slide === 5 && <SlideFreeAccess onStart={handleStart} />}
      </div>

      {/* Кнопки навигации */}
      {!isLast && (
        <div style={{
          padding: '12px 16px 24px',
          flexShrink: 0,
          display: 'flex', gap: 10,
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}>
          {slide > 0 && (
            <button
              onClick={handleBack}
              style={{
                padding: '13px 0', borderRadius: 10, border: 'none',
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
                fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
                width: 52, flexShrink: 0,
              }}
            >
              ‹
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canNext}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 10, border: 'none',
              background: canNext ? '#D4AF37' : 'var(--tg-theme-hint-color)',
              color: '#fff',
              fontSize: 15, fontWeight: 600,
              cursor: canNext ? 'pointer' : 'default',
              fontFamily: 'inherit',
              opacity: !canNext ? 0.5 : 1,
            }}
          >
            {slide === 3 && !answer ? 'Выберите вариант' : 'Далее →'}
          </button>
        </div>
      )}

      {/* CSS анимация мерцания */}
      <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.3); }
        }
      `}</style>
    </div>
  )
}

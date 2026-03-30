import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { useAuthStore } from '../store/authStore'
import { useApi } from '../hooks/useTier'

// ─── Контакт администратора — задайте в env или вставьте напрямую ─────────────
const ADMIN_CONTACT = import.meta.env.VITE_ADMIN_CONTACT ?? '@your_admin_username'

const PLANS = [
  {
    key:         'subscription_practitioner_monthly',
    name:        'Практик 🔥',
    price:       '299 ₽/мес',
    stars:       '~150 ⭐',
    tier:        'practitioner' as const,
    recommended: false,
    color:       '#e67e22',
    features: [
      '10 глав: масла, травы, камни, деревья',
      'Полная лунная магия — 8 фаз, знаки зодиака',
      'Очищение свечи — 7 методов',
      'Программирование намерений — 5 законов',
      'Скручивание свечей + нумерология',
      'Элементарная активация, ритуал алтаря',
      'Лунные уведомления',
      'Подбор свечи без ограничений',
    ],
  },
  {
    key:         'subscription_master_monthly',
    name:        'Мастер ✨',
    price:       '799 ₽/мес',
    stars:       '~400 ⭐',
    tier:        'master' as const,
    recommended: true,
    color:       '#7b2d8b',
    features: [
      'Все 22 главы без ограничений',
      '5 полных ритуалов (деньги, любовь, дом, очищение, предки)',
      'Церомантия и молибдомантия — словарь 60 символов',
      'Изготовление свечей своими руками — 5 рецептов',
      'Родовая практика со свечами предков',
      'Дневник практик',
      'Все справочные таблицы (12 таблиц)',
      'Лунный и травяной справочники',
    ],
  },
]

export function PaywallPage() {
  const navigate   = useNavigate()
  const api        = useApi()
  const updateTier = useAuthStore(s => s.updateTier)

  async function handleBuy(productKey: string, tier: 'practitioner' | 'master') {
    try {
      const { invoiceLink } = await api.post<{ invoiceLink: string }>(
        '/payments/stars/create',
        { productKey },
      )
      WebApp.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') {
          updateTier(tier)
          WebApp.showPopup({ message: '✨ Оплата прошла! Контент открыт.' })
          navigate('/library')
        }
      })
    } catch {
      WebApp.showPopup({ message: 'Ошибка оплаты. Попробуйте позже.' })
    }
  }

  function handleAdminContact() {
    WebApp.openTelegramLink(`https://t.me/${ADMIN_CONTACT.replace('@', '')}`)
  }

  return (
    <div style={{ padding: '20px 16px 100px', color: 'var(--tg-theme-text-color)' }}>

      {/* Заголовок */}
      <h2 style={{ textAlign: 'center', marginBottom: 6, fontSize: 22, fontWeight: 700 }}>
        Открыть полный доступ
      </h2>
      <p style={{
        textAlign: 'center', color: 'var(--tg-theme-hint-color)',
        marginBottom: 8, fontSize: 13, lineHeight: 1.5,
      }}>
        22 главы · 12 справочных таблиц · Все ритуалы
      </p>

      {/* Что уже доступно бесплатно */}
      <div style={{
        background: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 20,
        fontSize: 13, color: 'var(--tg-theme-hint-color)',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>Бесплатно:</span>
        {' '}5 глав — история свечи, философия огня, цвета, формы, виды воска
      </div>

      {/* Планы */}
      {PLANS.map(plan => (
        <div
          key={plan.key}
          style={{
            border: `${plan.recommended ? '2px' : '1.5px'} solid ${
              plan.recommended ? plan.color : 'var(--tg-theme-hint-color)'
            }`,
            borderRadius: 14,
            padding: '16px',
            marginBottom: 14,
            position: 'relative',
          }}
        >
          {plan.recommended && (
            <div style={{
              position: 'absolute', top: -11, left: '50%',
              transform: 'translateX(-50%)',
              background: plan.color, color: '#fff',
              fontSize: 11, padding: '2px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              fontWeight: 600,
            }}>
              Полный доступ
            </div>
          )}

          {/* Заголовок плана */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 12,
          }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{plan.name}</div>
              <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                {plan.stars}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, color: plan.color, fontWeight: 700 }}>
                {plan.price}
              </div>
            </div>
          </div>

          {/* Фичи */}
          <div style={{ marginBottom: 14 }}>
            {plan.features.map(f => (
              <div key={f} style={{
                display: 'flex', gap: 8, marginBottom: 5,
                fontSize: 13, color: 'var(--tg-theme-text-color)',
              }}>
                <span style={{ color: plan.color, flexShrink: 0 }}>✦</span>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleBuy(plan.key, plan.tier)}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: plan.recommended ? plan.color : 'var(--tg-theme-button-color)',
              color: '#fff', fontSize: 15, fontWeight: 600,
            }}
          >
            Оплатить Telegram Stars
          </button>
        </div>
      ))}

      {/* Блок: купить через администратора */}
      <div style={{
        border: '1.5px solid var(--tg-theme-hint-color)',
        borderRadius: 14, padding: '16px', marginBottom: 16,
        background: 'var(--tg-theme-secondary-bg-color)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
          💬 Купить через администратора
        </div>
        <p style={{
          fontSize: 13, color: 'var(--tg-theme-hint-color)',
          lineHeight: 1.6, margin: '0 0 12px',
        }}>
          Если у вас нет Telegram Stars или хотите оплатить другим способом —
          напишите администратору. Доступ выдаётся через персональный код.
        </p>
        <button
          onClick={handleAdminContact}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 10,
            border: '1.5px solid var(--tg-theme-button-color)',
            background: 'transparent',
            color: 'var(--tg-theme-button-color)',
            fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Написать администратору
        </button>
      </div>

      {/* Кнопка: остаться на free */}
      <button
        onClick={() => navigate(-1)}
        style={{
          width: '100%', padding: '10px 0', background: 'none',
          border: 'none', color: 'var(--tg-theme-hint-color)',
          fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Остаться на бесплатном доступе
      </button>

      {/* Сноска */}
      <p style={{
        textAlign: 'center', fontSize: 11, color: 'var(--tg-theme-hint-color)',
        marginTop: 12, lineHeight: 1.5,
      }}>
        Оплата через Telegram Stars — безопасно и мгновенно.
        Подписка активируется сразу после оплаты.
      </p>

    </div>
  )
}

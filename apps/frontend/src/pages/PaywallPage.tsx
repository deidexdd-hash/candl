import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { useAuthStore } from '../store/authStore'
import { useApi } from '../hooks/useTier'

const PLANS = [
  { key: 'subscription_practitioner_monthly', name: 'Практик 🔥', price: '299 ₽/мес', tier: 'practitioner' as const,
    features: ['Масла, камни, травы, деревья', 'Лунная магия полностью', 'Подбор свечи без лимита', 'Лунные уведомления'] },
  { key: 'subscription_master_monthly', name: 'Мастер ✨', price: '799 ₽/мес', tier: 'master' as const, recommended: true,
    features: ['Все 5 ритуалов', 'Изготовление свечей', 'Дневник практик', 'ИИ-помощник (5/день)'] },
]

export function PaywallPage() {
  const navigate = useNavigate()
  const api = useApi()
  const updateTier = useAuthStore(s => s.updateTier)

  async function handleBuy(productKey: string, tier: 'practitioner' | 'master') {
    try {
      const { invoiceLink } = await api.post<{ invoiceLink: string }>('/payments/stars/create', { productKey })

      // Открываем нативный Telegram Stars диалог
      WebApp.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') {
          updateTier(tier)
          WebApp.showPopup({ message: 'Оплата прошла! Контент открыт.' })
          navigate('/library')
        }
      })
    } catch (err) {
      WebApp.showPopup({ message: 'Ошибка оплаты. Попробуйте позже.' })
    }
  }

  return (
    <div style={{ padding: '20px 16px', color: 'var(--tg-theme-text-color)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Выберите тариф</h2>
      <p style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)', marginBottom: 24, fontSize: 14 }}>
        Оплата через Telegram Stars — безопасно и быстро
      </p>

      {PLANS.map(plan => (
        <div
          key={plan.key}
          style={{
            border: `${plan.recommended ? '2px' : '1px'} solid ${plan.recommended ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)'}`,
            borderRadius: 12,
            padding: '16px',
            marginBottom: 12,
            position: 'relative',
          }}
        >
          {plan.recommended && (
            <div style={{
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
              fontSize: 11, padding: '2px 12px', borderRadius: 20, whiteSpace: 'nowrap',
            }}>Рекомендуем</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 500 }}>{plan.name}</span>
            <span style={{ fontSize: 15, color: 'var(--tg-theme-button-color)', fontWeight: 500 }}>{plan.price}</span>
          </div>

          <ul style={{ margin: '0 0 14px', padding: '0 0 0 16px', fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
            {plan.features.map(f => <li key={f} style={{ marginBottom: 3 }}>{f}</li>)}
          </ul>

          <button
            onClick={() => handleBuy(plan.key, plan.tier)}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
              fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
            }}
          >
            Оплатить Stars
          </button>
        </div>
      ))}

      <button
        onClick={() => navigate(-1)}
        style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none',
          color: 'var(--tg-theme-hint-color)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Остаться на бесплатном
      </button>
    </div>
  )
}

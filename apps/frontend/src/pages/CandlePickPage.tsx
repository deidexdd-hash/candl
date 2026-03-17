import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useApi, useTier } from '../hooks/useTier'

const INTENTIONS = [
  'Любовь', 'Деньги', 'Защита', 'Здоровье', 'Карьера',
  'Очищение', 'Удача', 'Духовность', 'Творчество', 'Мир в доме',
]

interface PickResult {
  color: string
  oil: string
  stone: string
  moonPhase: string
  moonPhaseRu: string
  usedToday: number
  dailyLimit: number | null
}

export function CandlePickPage() {
  const [intention, setIntention] = useState('')
  const [result, setResult] = useState<PickResult | null>(null)
  const api = useApi()
  const navigate = useNavigate()
  const { isFree } = useTier()

  const { mutate, isPending } = useMutation({
    mutationFn: (intention: string) =>
      api.post<PickResult>('/candle/pick', { intention }),
    onSuccess: setResult,
    onError: (err: any) => {
      if (err.code === 'PAYMENT_REQUIRED') navigate('/paywall')
    },
  })

  if (result) {
    return <ResultScreen result={result} onReset={() => setResult(null)} isFree={isFree} />
  }

  return (
    <div style={{ padding: '24px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Подбор свечи</h1>
      <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, marginBottom: 24 }}>
        Опишите намерение или выберите из списка
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {INTENTIONS.map(i => (
          <button key={i} onClick={() => setIntention(i)} style={{
            padding: '7px 14px', borderRadius: 20,
            border: `1px solid ${intention === i ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)'}`,
            background: intention === i ? 'var(--tg-theme-button-color)' : 'none',
            color: intention === i ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>{i}</button>
        ))}
      </div>

      <textarea
        value={intention}
        onChange={e => setIntention(e.target.value)}
        placeholder="Или напишите своё намерение..."
        style={{
          width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--tg-theme-hint-color)',
          background: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)', fontSize: 15,
          fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
        }}
      />

      {isFree && (
        <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '8px 0 0' }}>
          Бесплатно: 3 подбора в день
        </p>
      )}

      <button
        onClick={() => intention.trim() && mutate(intention.trim())}
        disabled={!intention.trim() || isPending}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', marginTop: 16,
          background: intention.trim() ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
          color: 'var(--tg-theme-button-text-color)', fontSize: 16, fontWeight: 500,
          cursor: intention.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
        }}
      >
        {isPending ? 'Подбираю...' : 'Подобрать'}
      </button>
    </div>
  )
}

function ResultScreen({ result, onReset, isFree }: { result: PickResult; onReset: () => void; isFree: boolean }) {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '24px 16px 100px', color: 'var(--tg-theme-text-color)' }}>
      <h2 style={{ marginBottom: 24, fontSize: 20 }}>Ваша свеча</h2>
      {[
        { label: '🕯 Цвет',      value: result.color },
        { label: '🌿 Масло',     value: result.oil },
        { label: '💎 Камень',    value: result.stone },
        { label: '🌙 Фаза Луны', value: result.moonPhaseRu },
      ].map(row => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderBottom: '0.5px solid var(--tg-theme-hint-color)',
        }}>
          <span style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>{row.label}</span>
          <span style={{ fontWeight: 500 }}>{row.value}</span>
        </div>
      ))}

      {isFree && result.dailyLimit && (
        <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 12 }}>
          Использовано сегодня: {result.usedToday} / {result.dailyLimit}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        <button onClick={onReset} style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
          fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>Ещё раз</button>
        <button onClick={() => navigate('/library/16')} style={{
          width: '100%', padding: '12px 0', borderRadius: 10,
          border: '1px solid var(--tg-theme-button-color)', background: 'none',
          color: 'var(--tg-theme-button-color)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
        }}>Открыть ритуал в книге</button>
      </div>
    </div>
  )
}

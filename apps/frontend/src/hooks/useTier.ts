import { useAuthStore } from '../store/authStore'

type Tier = 'free' | 'practitioner' | 'master' | 'annual'

const TIER_ORDER: Record<Tier, number> = {
  free: 0, practitioner: 1, master: 2, annual: 3
}

// Проверка доступа по тарифу — основной хук tier-gating
export function useTier() {
  const user = useAuthStore(s => s.user)
  const tier = user?.tier ?? 'free'

  return {
    tier,
    isPractitioner: TIER_ORDER[tier] >= 1,
    isMaster:       TIER_ORDER[tier] >= 2,
    hasAccess: (min: Tier) => TIER_ORDER[tier] >= TIER_ORDER[min],
    isFree: tier === 'free',
  }
}

// Хук для запросов к API с автоматическим JWT
export function useApi() {
  const token = useAuthStore(s => s.token)
  const API = import.meta.env.VITE_API_URL

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw Object.assign(new Error(err.error ?? 'API Error'), { code: err.code, status: res.status })
    }

    return res.json()
  }

  return {
    get:    <T>(path: string) => request<T>(path),
    post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

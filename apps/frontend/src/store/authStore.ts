import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  telegramId: string
  firstName: string | null
  tier: 'free' | 'practitioner' | 'master' | 'annual'
  isAdmin?: boolean
}

interface AuthStore {
  token: string | null
  user: User | null
  isNew: boolean
  login: (token: string, user: User) => void
  updateTier: (tier: User['tier']) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isNew: false,
      login: (token, user) => set({ token, user, isNew: (user as any).isNew ?? false }),
      updateTier: (tier) => set(s => ({ user: s.user ? { ...s.user, tier } : null })),
      logout: () => {
        localStorage.removeItem('auth')
        set({ token: null, user: null })
      },
    }),
    { name: 'auth' }
  )
)

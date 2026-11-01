import { beforeEach, describe, expect, it, vi } from 'vitest'

const exchangeCodeForSession = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession } }),
}))

import { GET } from '@/app/auth/callback/route'

const callback = (query: string) => GET(new Request(`http://localhost:3000/auth/callback?${query}`))

beforeEach(() => {
  exchangeCodeForSession.mockReset()
})

describe('callback obnovy hesla', () => {
  it('platný odkaz vedie na formulár nového hesla', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await callback('type=recovery&code=ok')

    expect(response.headers.get('location')).toBe('http://localhost:3000/reset-password')
  })

  it('vypršaný alebo použitý odkaz vedie na žiadosť o nový odkaz', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { status: 403, message: 'Email link is invalid or has expired' },
    })

    const response = await callback('type=recovery&code=stary')

    expect(response.headers.get('location')).toBe('http://localhost:3000/forgot-password?expired=1')
  })

  it('odkaz bez kódu vedie na žiadosť o nový odkaz', async () => {
    const response = await callback('type=recovery')

    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('http://localhost:3000/forgot-password?expired=1')
  })
})

describe('callback prihlásenia', () => {
  it('pokračuje na bezpečnú cestu z parametra next', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await callback('code=ok&next=/profile')

    expect(response.headers.get('location')).toBe('http://localhost:3000/profile')
  })
})

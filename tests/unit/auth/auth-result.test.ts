import { describe, expect, it } from 'vitest'

import { authorize, isAuthenticated, toAuthResult } from '@/lib/auth/auth-result'
import { ROLES } from '@/lib/auth/roles'
import { anonymousInput, brokenRoleInput, identityInput, profileFixture } from '../fixtures/identities'

describe('toAuthResult', () => {
  it('anonymný vstup je unauthenticated', () => {
    expect(toAuthResult(anonymousInput())).toEqual({ status: 'unauthenticated' })
  })

  it.each([null, undefined, '', '   ', 42, {}])('nepoužiteľné userId (%s) je unauthenticated', (userId) => {
    expect(toAuthResult({ userId, profile: profileFixture('admin') }).status).toBe('unauthenticated')
  })

  it.each(ROLES)('overená identita s rolou %s je authenticated', (role) => {
    const result = toAuthResult(identityInput(role))

    expect(result.status).toBe('authenticated')

    if (isAuthenticated(result)) {
      expect(result.identity.role).toBe(role)
      expect(result.identity.email).toBe(`${role}@example.test`)
    }
  })

  it('chýbajúci profil zlyhá zatvorene', () => {
    expect(toAuthResult({ userId: 'abc', profile: null })).toEqual({ status: 'denied', reason: 'missing-profile' })
  })

  it.each([null, undefined, '', 'Admin', 'root', 7, {}])('neznáma rola (%s) zlyhá zatvorene', (role) => {
    expect(toAuthResult(brokenRoleInput(role))).toEqual({ status: 'denied', reason: 'unknown-role' })
  })

  it('neznáma rola sa nikdy nestane user', () => {
    const result = toAuthResult(brokenRoleInput('superuser'))

    expect(isAuthenticated(result)).toBe(false)
  })

  it('prázdny e-mail sa normalizuje na null', () => {
    const result = toAuthResult({ userId: 'abc', email: '', profile: profileFixture('user') })

    expect(isAuthenticated(result) && result.identity.email).toBeNull()
  })
})

describe('injektáž roly cez metadáta', () => {
  const injections: Array<[string, Record<string, unknown>]> = [
    ['user_metadata', { user_metadata: { role: 'admin' } }],
    ['raw_user_meta_data', { raw_user_meta_data: { role: 'owner' } }],
    ['app_metadata', { app_metadata: { role: 'owner' } }],
    ['telo požiadavky', { body: { role: 'admin' } }],
    ['query parameter', { searchParams: { role: 'owner' } }],
    ['cookie', { cookies: { role: 'admin' } }],
    ['JWT claim', { claims: { role: 'owner', user_role: 'owner' } }],
    ['plochý parameter', { role: 'owner' }],
  ]

  it.each(injections)('%s nezmení dôveryhodnú rolu', (_label, injected) => {
    const result = toAuthResult({ ...identityInput('user'), ...injected })

    expect(isAuthenticated(result) && result.identity.role).toBe('user')
    expect(authorize(result, 'training:manage')).toBe(false)
    expect(authorize(result, 'security:break-glass')).toBe(false)
  })

  it('rola z profilu ostáva jediným zdrojom pravdy', () => {
    const result = toAuthResult({
      userId: 'abc',
      profile: profileFixture('user'),
      user_metadata: { role: 'admin' },
    } as Parameters<typeof toAuthResult>[0])

    expect(isAuthenticated(result) && result.identity.role).toBe('user')
  })
})

describe('authorize', () => {
  it('neautentifikovaný výsledok nedostane nič', () => {
    const result = toAuthResult(anonymousInput())

    expect(authorize(result, 'training:view')).toBe(false)
    expect(authorize(result, 'statistics:view')).toBe(false)
  })

  it('zamietnutý výsledok nedostane nič', () => {
    const result = toAuthResult(brokenRoleInput('root'))

    expect(authorize(result, 'training:view')).toBe(false)
  })

  it('rozlíši bežného, admin a owner používateľa', () => {
    expect(authorize(toAuthResult(identityInput('user')), 'training:register')).toBe(true)
    expect(authorize(toAuthResult(identityInput('user')), 'statistics:view')).toBe(false)
    expect(authorize(toAuthResult(identityInput('admin')), 'statistics:view')).toBe(true)
    expect(authorize(toAuthResult(identityInput('admin')), 'security:break-glass')).toBe(false)
    expect(authorize(toAuthResult(identityInput('owner')), 'security:break-glass')).toBe(true)
  })
})

describe('izolácia fixtures', () => {
  it('dve volania vracajú nezávislé objekty', () => {
    const first = profileFixture('admin')
    const second = profileFixture('admin')

    first.role = 'owner'
    first.email = 'zmenene@example.test'

    expect(second.role).toBe('admin')
    expect(second.email).toBe('admin@example.test')
  })

  it('mutácia vstupu neovplyvní ďalší vstup', () => {
    const first = identityInput('user')
    ;(first.profile as { role: string }).role = 'owner'

    const second = identityInput('user')

    expect(isAuthenticated(toAuthResult(second)) && toAuthResult(second)).toMatchObject({
      identity: { role: 'user' },
    })
  })
})

describe('nezávislosť od prostredia', () => {
  it('kontrakty nepotrebujú Supabase URL ani kľúče', () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    try {
      expect(authorize(toAuthResult(identityInput('admin')), 'statistics:view')).toBe(true)
    } finally {
      if (url !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = url
      if (anon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anon
      if (service !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = service
    }
  })
})

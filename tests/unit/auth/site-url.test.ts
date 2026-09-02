import { describe, expect, it } from 'vitest'

import { authCallbackUrl, siteOrigin } from '@/lib/site-url'

describe('siteOrigin', () => {
  it.each([
    ['https://newcitypark.sk', 'https://newcitypark.sk'],
    ['https://newcitypark.sk/', 'https://newcitypark.sk'],
    ['http://localhost:3000', 'http://localhost:3000'],
    ['http://localhost:3000/', 'http://localhost:3000'],
  ])('normalizuje %s', (input, expected) => {
    expect(siteOrigin(input)).toBe(expected)
  })

  it.each([
    ['prázdny reťazec', ''],
    ['bez protokolu', 'newcitypark.sk'],
    ['nepodporovaný protokol', 'ftp://newcitypark.sk'],
    ['s cestou', 'https://newcitypark.sk/app'],
    ['s parametrom', 'https://newcitypark.sk/?a=1'],
  ])('odmietne %s', (_label, input) => {
    expect(() => siteOrigin(input)).toThrow()
  })

  // The default argument reads process.env, so the variable has to be cleared
  // here; CI sets it and the assertion would otherwise pass only locally.
  it('odmietne chýbajúcu premennú prostredia', () => {
    const saved = process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_SITE_URL

    try {
      expect(() => siteOrigin()).toThrow()
    } finally {
      if (saved !== undefined) process.env.NEXT_PUBLIC_SITE_URL = saved
    }
  })

  it('prečíta premennú prostredia, keď argument nie je zadaný', () => {
    const saved = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'https://newcitypark.sk/'

    try {
      expect(siteOrigin()).toBe('https://newcitypark.sk')
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
      else process.env.NEXT_PUBLIC_SITE_URL = saved
    }
  })
})

describe('authCallbackUrl', () => {
  const origin = 'https://newcitypark.sk'

  it('poskladá callback bez parametrov', () => {
    expect(authCallbackUrl({}, origin)).toBe('https://newcitypark.sk/auth/callback')
  })

  it('pridá parametre a zakóduje ich', () => {
    expect(authCallbackUrl({ type: 'recovery' }, origin)).toBe('https://newcitypark.sk/auth/callback?type=recovery')
    expect(authCallbackUrl({ next: '/statistics?month=2026-08' }, origin)).toBe(
      'https://newcitypark.sk/auth/callback?next=%2Fstatistics%3Fmonth%3D2026-08',
    )
  })

  it('neplatný pôvod neprejde', () => {
    expect(() => authCallbackUrl({}, 'newcitypark.sk')).toThrow()
  })
})

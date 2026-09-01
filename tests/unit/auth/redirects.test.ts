import { describe, expect, it } from 'vitest'

import { DEFAULT_REDIRECT, LOGIN_PATH, loginPathWithNext, safeNextPath } from '@/lib/auth/redirects'

describe('safeNextPath', () => {
  it.each(['/statistics', '/statistics?month=2026-08', '/trainings/12/edit', '/profile#top'])(
    'ponechá cestu v rámci vlastného pôvodu (%s)',
    (path) => {
      expect(safeNextPath(path)).toBe(path)
    },
  )

  it.each([
    ['protokolovo relatívna URL', '//evil.example'],
    ['absolútna URL', 'https://evil.example/calendar'],
    ['spätné lomítko', '/\\evil.example'],
    ['relatívna cesta', 'calendar'],
    ['prázdny reťazec', ''],
    ['nový riadok v hlavičke', `/calendar${String.fromCharCode(10)}Set-Cookie: x=1`],
    ['NUL znak', `/calendar${String.fromCharCode(0)}`],
  ])('odmietne %s', (_label, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_REDIRECT)
  })

  it.each([null, undefined, 42, {}, ['/calendar']])('odmietne nereťazcový vstup (%s)', (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_REDIRECT)
  })

  it.each([LOGIN_PATH, `${LOGIN_PATH}?next=%2Fprofile`])('odmietne prihlasovaciu stránku (%s)', (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_REDIRECT)
  })

  it('použije zadaný fallback', () => {
    expect(safeNextPath('https://evil.example', '/profile')).toBe('/profile')
  })
})

describe('loginPathWithNext', () => {
  it('zakóduje bezpečný cieľ do parametra next', () => {
    expect(loginPathWithNext('/statistics?month=2026-08')).toBe('/login?next=%2Fstatistics%3Fmonth%3D2026-08')
  })

  it.each([null, '', 'https://evil.example', '//evil.example'])(
    'pri nebezpečnom cieli (%s) nepridá parameter',
    (value) => {
      expect(loginPathWithNext(value)).toBe(LOGIN_PATH)
    },
  )
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ROLES } from '@/lib/auth/roles'
import { profileFixture } from '../fixtures/identities'

// React cache() does not memoize outside a request scope, so the test doubles
// it with a single-slot memo. That keeps the dedupe assertion meaningful.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()

  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => {
      let cached: { value: ReturnType<T> } | null = null

      return ((...args: Parameters<T>) => {
        cached ??= { value: fn(...args) as ReturnType<T> }

        return cached.value
      }) as T
    },
  }
})

class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`)
  }
}

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new RedirectError(url)
  },
}))

const requestPath = { value: null as string | null }

vi.mock('next/headers', () => ({
  headers: async () => ({ get: () => requestPath.value }),
}))

const supabase = {
  getUser: vi.fn(),
  profile: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: supabase.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: supabase.profile,
        }),
      }),
    }),
  }),
}))

const AUTH_USER = { id: profileFixture('user').id, email: 'user@example.test', user_metadata: {} }

function signedIn(profile: unknown, metadata: Record<string, unknown> = {}) {
  supabase.getUser.mockResolvedValue({ data: { user: { ...AUTH_USER, user_metadata: metadata } } })
  supabase.profile.mockResolvedValue({ data: profile, error: profile ? null : { message: 'no rows' } })
}

function anonymous() {
  supabase.getUser.mockResolvedValue({ data: { user: null } })
  supabase.profile.mockResolvedValue({ data: null, error: null })
}

async function importDal() {
  return import('@/lib/auth/dal')
}

async function redirectedTo(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (error) {
    if (error instanceof RedirectError) return error.url
    throw error
  }

  throw new Error('Očakávalo sa presmerovanie, ktoré nenastalo')
}

beforeEach(() => {
  vi.resetModules()
  supabase.getUser.mockReset()
  supabase.profile.mockReset()
  requestPath.value = null
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('auth', () => {
  it('bez prihláseného používateľa je unauthenticated a profil sa nedotazuje', async () => {
    anonymous()
    const { auth } = await importDal()

    expect(await auth()).toEqual({ status: 'unauthenticated' })
    expect(supabase.profile).not.toHaveBeenCalled()
  })

  it('chýbajúci profil zlyhá zatvorene', async () => {
    signedIn(null)
    const { auth } = await importDal()

    expect(await auth()).toEqual({ status: 'denied', reason: 'missing-profile' })
  })

  it.each([null, undefined, '', 'Admin', 'superuser', 7])('neznáma rola (%s) zlyhá zatvorene', async (role) => {
    signedIn({ ...profileFixture('user'), role })
    const { auth } = await importDal()

    expect(await auth()).toEqual({ status: 'denied', reason: 'unknown-role' })
  })

  it.each(ROLES)('platná rola %s prejde a nesie údaje z profilu', async (role) => {
    signedIn(profileFixture(role, { fullName: 'Jana Nováková', phoneNumber: '+421900000000' }))
    const { auth } = await importDal()
    const session = await auth()

    expect(session).toEqual({
      status: 'authenticated',
      user: {
        // The id always comes from the verified session, never from the profile row.
        id: AUTH_USER.id,
        email: 'user@example.test',
        role,
        name: 'Jana Nováková',
        phone: '+421900000000',
      },
    })
  })

  it('rola z metadát identity nezmení rolu z profilu', async () => {
    signedIn(profileFixture('user'), { role: 'owner', is_admin: true })
    const { auth } = await importDal()
    const session = await auth()

    expect(session.status === 'authenticated' && session.user.role).toBe('user')
  })

  it('meno doplní z metadát, len keď profil nemá fullName', async () => {
    signedIn(profileFixture('user', { fullName: null }), { first_name: 'Jana', last_name: 'Nováková' })
    const { auth } = await importDal()
    const session = await auth()

    expect(session.status === 'authenticated' && session.user.name).toBe('Jana Nováková')
  })

  it('jeden priechod sa pýta na identitu a profil práve raz', async () => {
    signedIn(profileFixture('admin'))
    const { auth } = await importDal()

    await auth()
    await auth()
    await auth()

    expect(supabase.getUser).toHaveBeenCalledTimes(1)
    expect(supabase.profile).toHaveBeenCalledTimes(1)
  })
})

describe('requireUser', () => {
  it('presmeruje anonymného volajúceho na login s bezpečným next', async () => {
    anonymous()
    requestPath.value = '/statistics?month=2026-08'
    const { requireUser } = await importDal()

    expect(await redirectedTo(requireUser)).toBe('/login?next=%2Fstatistics%3Fmonth%3D2026-08')
  })

  it('zamietnutého volajúceho presmeruje rovnako ako anonymného', async () => {
    signedIn({ ...profileFixture('user'), role: 'superuser' })
    const { requireUser } = await importDal()

    expect(await redirectedTo(requireUser)).toBe('/login')
  })

  it('cieľ mimo vlastného pôvodu zahodí a next nepridá', async () => {
    anonymous()
    requestPath.value = '//evil.example'
    const { requireUser } = await importDal()

    expect(await redirectedTo(requireUser)).toBe('/login')
  })

  it('prihláseného vráti', async () => {
    signedIn(profileFixture('user'))
    const { requireUser } = await importDal()

    expect((await requireUser()).role).toBe('user')
  })
})

describe('requireAdmin a requireOwner', () => {
  it.each([
    ['user', false, false],
    ['admin', true, false],
    ['owner', true, true],
  ] as const)('%s: admin=%s, owner=%s', async (role, adminAllowed, ownerAllowed) => {
    signedIn(profileFixture(role))
    const { requireAdmin, requireOwner } = await importDal()

    if (adminAllowed) {
      expect((await requireAdmin()).role).toBe(role)
    } else {
      expect(await redirectedTo(requireAdmin)).toBe('/calendar')
    }

    if (ownerAllowed) {
      expect((await requireOwner()).role).toBe(role)
    } else {
      expect(await redirectedTo(requireOwner)).toBe('/calendar')
    }
  })
})

describe('authorizeRequest', () => {
  it('anonymný volajúci dostane 401', async () => {
    anonymous()
    const { authorizeRequest } = await importDal()
    const result = await authorizeRequest()

    expect(result.ok).toBe(false)
    expect(!result.ok && result.response.status).toBe(401)
  })

  it('zamietnutá rola dostane 401, nie 403', async () => {
    signedIn({ ...profileFixture('admin'), role: 'root' })
    const { authorizeRequest } = await importDal()
    const result = await authorizeRequest('training:manage')

    expect(!result.ok && result.response.status).toBe(401)
  })

  it('prihlásený bez kapability dostane 403', async () => {
    signedIn(profileFixture('user'))
    const { authorizeRequest } = await importDal()
    const result = await authorizeRequest('statistics:view')

    expect(!result.ok && result.response.status).toBe(403)
  })

  it('prihlásený s kapabilitou prejde a nevracia odpoveď', async () => {
    signedIn(profileFixture('owner'))
    const { authorizeRequest } = await importDal()
    const result = await authorizeRequest('statistics:view')

    expect(result.ok && result.user.role).toBe('owner')
  })

  it('bez požadovanej kapability stačí prihlásenie', async () => {
    signedIn(profileFixture('user'))
    const { authorizeRequest } = await importDal()

    expect((await authorizeRequest()).ok).toBe(true)
  })
})

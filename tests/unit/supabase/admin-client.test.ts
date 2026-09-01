import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real package throws when imported outside a server module.
vi.mock('server-only', () => ({}))

const createClient = vi.fn(() => ({ marker: 'privileged' }))

vi.mock('@supabase/supabase-js', () => ({ createClient }))

const ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const

const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key]

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  createClient.mockClear()
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

async function importAdmin() {
  vi.resetModules()

  return import('@/lib/supabase/admin')
}

describe('createSupabaseAdminClient', () => {
  it('vytvorí klienta so service-role kľúčom', async () => {
    const { createSupabaseAdminClient } = await importAdmin()

    createSupabaseAdminClient()

    expect(createClient).toHaveBeenCalledWith('https://project.supabase.test', 'secret-key', expect.anything())
  })

  it('bez service-role kľúča zlyhá a nesiahne po anon kľúči', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const { createSupabaseAdminClient } = await importAdmin()

    expect(() => createSupabaseAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('bez URL zlyhá', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const { createSupabaseAdminClient } = await importAdmin()

    expect(() => createSupabaseAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('import modulu bez tajomstva nespadne, zlyhá až volanie', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    await expect(importAdmin()).resolves.toBeDefined()
    expect(createClient).not.toHaveBeenCalled()
  })
})

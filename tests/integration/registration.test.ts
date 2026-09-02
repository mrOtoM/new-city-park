import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { type TestAccount, admin, anonClient, createAccount, deleteAccount, signIn } from './setup'

const created: TestAccount[] = []
const createdTrainings: number[] = []

afterAll(async () => {
  if (createdTrainings.length > 0) await admin.from('trainings').delete().in('id', createdTrainings)
  for (const testAccount of created) await deleteAccount(testAccount)
})

/**
 * Supabase rate-limits the token endpoint, so sessions are created once,
 * sequentially, and reused by every test in this file.
 */
const pool: SupabaseClient[] = []

beforeAll(async () => {
  for (let index = 0; index < 5; index += 1) {
    const testAccount = await createAccount()
    created.push(testAccount)
    pool.push(await signIn(testAccount))
  }
}, 60000)

function clients(count: number): SupabaseClient[] {
  if (count > pool.length) throw new Error('Testovací pool je menší, než test žiada')

  return pool.slice(0, count)
}

/** Local wall-clock time, matching how the application stores training datetimes. */
function localIso(offsetHours: number): string {
  const date = new Date(Date.now() + offsetHours * 3600_000)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

async function training(fields: { maxParticipants?: number | null; hoursFromNow?: number; deadlineHours?: number }) {
  const { data, error } = await admin
    .from('trainings')
    .insert([
      {
        type: 'kondicny',
        datetime: localIso(fields.hoursFromNow ?? 48),
        maxParticipants: fields.maxParticipants ?? null,
        unregisterDeadline: fields.deadlineHours === undefined ? null : localIso(fields.deadlineHours),
      },
    ])
    .select('id')
    .single()

  if (error) throw new Error(`Tréning sa nepodarilo vytvoriť: ${error.message}`)
  createdTrainings.push(data.id)

  return data.id as number
}

const register = (client: SupabaseClient, trainingId: number) =>
  client.rpc('register_for_training', { p_training_id: trainingId })

const unregister = (client: SupabaseClient, trainingId: number) =>
  client.rpc('unregister_from_training', { p_training_id: trainingId })

async function activeCount(trainingId: number): Promise<number> {
  const { count } = await admin
    .from('training_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('training_id', trainingId)
    .is('cancelled_at', null)

  return count ?? 0
}

describe('kapacita je atomická', () => {
  it('dvaja súbežne na tréning pre jedného: prejde práve jeden', async () => {
    const trainingId = await training({ maxParticipants: 1 })

    const results = await Promise.all(clients(2).map((client) => register(client, trainingId)))
    const codes = results.map((r) => r.data)

    expect(codes.filter((code) => code === 'ok')).toHaveLength(1)
    expect(codes.filter((code) => code === 'full')).toHaveLength(1)
    expect(await activeCount(trainingId)).toBe(1)
  })

  it('päť súbežne na tréning pre dvoch: zostanú dvaja', async () => {
    const trainingId = await training({ maxParticipants: 2 })

    const results = await Promise.all(clients(5).map((client) => register(client, trainingId)))

    expect(results.filter((r) => r.data === 'ok')).toHaveLength(2)
    expect(results.filter((r) => r.data === 'full')).toHaveLength(3)
    expect(await activeCount(trainingId)).toBe(2)
  })

  it('bez limitu prejdú všetci', async () => {
    const trainingId = await training({ maxParticipants: null })

    await Promise.all(clients(4).map((client) => register(client, trainingId)))

    expect(await activeCount(trainingId)).toBe(4)
  })
})

describe('pravidlá prihlásenia', () => {
  it('na tréning, ktorý už prebehol, sa prihlásiť nedá', async () => {
    const trainingId = await training({ hoursFromNow: -2 })
    const [client] = clients(1)

    const { data } = await register(client, trainingId)

    expect(data).toBe('past')
    expect(await activeCount(trainingId)).toBe(0)
  })

  it('druhé prihlásenie nevytvorí druhý riadok', async () => {
    const trainingId = await training({})
    const [client] = clients(1)

    expect((await register(client, trainingId)).data).toBe('ok')
    expect((await register(client, trainingId)).data).toBe('already_registered')
    expect(await activeCount(trainingId)).toBe(1)
  })

  it('neexistujúci tréning vráti not_found', async () => {
    const [client] = clients(1)

    expect((await register(client, 987654321)).data).toBe('not_found')
  })

  it('anonymný volajúci funkciu nespustí', async () => {
    const { error } = await register(anonClient(), await training({}))

    expect(error?.code).toBe('42501')
  })
})

describe('pravidlá odhlásenia', () => {
  it('po odhlásení sa dá prihlásiť znova a riadok sa recykluje', async () => {
    const trainingId = await training({})
    const [client] = clients(1)

    await register(client, trainingId)
    expect((await unregister(client, trainingId)).data).toBe('ok')
    expect(await activeCount(trainingId)).toBe(0)

    expect((await register(client, trainingId)).data).toBe('ok')
    expect(await activeCount(trainingId)).toBe(1)

    const { count } = await admin
      .from('training_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('training_id', trainingId)

    expect(count).toBe(1)
  })

  it('po termíne sa odhlásiť nedá a registrácia zostáva', async () => {
    const trainingId = await training({ hoursFromNow: 48, deadlineHours: -1 })
    const [client] = clients(1)

    await register(client, trainingId)

    expect((await unregister(client, trainingId)).data).toBe('deadline_passed')
    expect(await activeCount(trainingId)).toBe(1)
  })

  it('odhlásenie bez prihlásenia vráti not_registered', async () => {
    const trainingId = await training({})
    const [client] = clients(1)

    expect((await unregister(client, trainingId)).data).toBe('not_registered')
  })
})

describe('trainings už nie sú verejné', () => {
  it('anon neprečíta tréningy', async () => {
    const { error } = await anonClient().from('trainings').select('id').limit(1)

    expect(error?.code).toBe('42501')
  })

  it('prihlásený používateľ tréningy číta', async () => {
    const [client] = clients(1)

    const { error, data } = await client.from('trainings').select('id').limit(1)

    expect(error).toBeNull()
    expect(data).not.toBeNull()
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { type TestAccount, admin, anonClient, createAccount, deleteAccount, signIn } from './setup'

const created: TestAccount[] = []
const createdTrainings: number[] = []

afterAll(async () => {
  if (createdTrainings.length > 0) await admin.from('trainings').delete().in('id', createdTrainings)
  for (const testAccount of created) await deleteAccount(testAccount)
})

/** Seven signed-in users: one participant plus six hopefuls, one over the waitlist limit. */
const pool: SupabaseClient[] = []
let adminClient: SupabaseClient

beforeAll(async () => {
  for (let index = 0; index < 7; index += 1) {
    const testAccount = await createAccount()
    created.push(testAccount)
    pool.push(await signIn(testAccount))
  }

  const adminAccount = await createAccount('admin')
  created.push(adminAccount)
  adminClient = await signIn(adminAccount)
}, 90000)

function localIso(offsetHours: number): string {
  const date = new Date(Date.now() + offsetHours * 3600_000)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

async function training(fields: { maxParticipants?: number | null; hoursFromNow?: number } = {}) {
  const { data, error } = await admin
    .from('trainings')
    .insert([
      { type: 'kondicny', datetime: localIso(fields.hoursFromNow ?? 48), maxParticipants: fields.maxParticipants ?? 1 },
    ])
    .select('id')
    .single()

  if (error) throw new Error(`Tréning sa nepodarilo vytvoriť: ${error.message}`)
  createdTrainings.push(data.id)

  return data.id as number
}

const rpc = (client: SupabaseClient, name: string, trainingId: number) =>
  client.rpc(name, { p_training_id: trainingId })

const register = (client: SupabaseClient, id: number) => rpc(client, 'register_for_training', id)
const unregister = (client: SupabaseClient, id: number) => rpc(client, 'unregister_from_training', id)
const join = (client: SupabaseClient, id: number) => rpc(client, 'join_training_waitlist', id)
const leave = (client: SupabaseClient, id: number) => rpc(client, 'leave_training_waitlist', id)
const claim = (client: SupabaseClient, id: number) => rpc(client, 'claim_waitlist_notifications', id)

/** A training for one, already full, so the waitlist is the only way in. */
async function fullTraining() {
  const trainingId = await training({ maxParticipants: 1 })
  const { data } = await register(pool[0], trainingId)

  if (data !== 'ok') throw new Error(`Príprava zlyhala: ${data}`)

  return trainingId
}

async function capacity(trainingId: number) {
  const { data, error } = await admin
    .from('training_capacity')
    .select('active_count, waitlist_count, waitlist_max')
    .eq('training_id', trainingId)
    .single()

  if (error) throw error

  return { active: Number(data.active_count), waitlist: Number(data.waitlist_count), max: Number(data.waitlist_max) }
}

async function notifiedFlags(trainingId: number): Promise<(string | null)[]> {
  const { data } = await admin.from('training_waitlist').select('notified_at').eq('training_id', trainingId)

  return (data ?? []).map((row) => row.notified_at)
}

describe('zapísanie medzi náhradníkov', () => {
  it('na tréning s voľným miestom vráti not_full', async () => {
    const trainingId = await training({ maxParticipants: 2 })

    expect((await join(pool[1], trainingId)).data).toBe('not_full')
  })

  it('na tréning bez limitu vráti not_full', async () => {
    const trainingId = await training({ maxParticipants: null })

    expect((await join(pool[1], trainingId)).data).toBe('not_full')
  })

  it('na plný tréning prejde a view ho započíta', async () => {
    const trainingId = await fullTraining()

    expect((await join(pool[1], trainingId)).data).toBe('ok')
    expect(await capacity(trainingId)).toEqual({ active: 1, waitlist: 1, max: 5 })
  })

  it('prihlásený účastník sa náhradníkom stať nemôže', async () => {
    const trainingId = await fullTraining()

    expect((await join(pool[0], trainingId)).data).toBe('already_registered')
  })

  it('druhé zapísanie vráti already_waitlisted', async () => {
    const trainingId = await fullTraining()
    await join(pool[1], trainingId)

    expect((await join(pool[1], trainingId)).data).toBe('already_waitlisted')
  })

  it('šiesty náhradník dostane waitlist_full', async () => {
    const trainingId = await fullTraining()

    for (const client of pool.slice(1, 6)) expect((await join(client, trainingId)).data).toBe('ok')

    expect((await join(pool[6], trainingId)).data).toBe('waitlist_full')
    expect((await capacity(trainingId)).waitlist).toBe(5)
  })

  it('tréning, ktorý už prebehol, vráti past', async () => {
    const trainingId = await training({ maxParticipants: 1, hoursFromNow: -2 })

    expect((await join(pool[1], trainingId)).data).toBe('past')
  })

  it('neexistujúci tréning vráti not_found', async () => {
    expect((await join(pool[1], -1)).data).toBe('not_found')
  })
})

describe('odchod z náhradníkov', () => {
  it('leave vráti ok a potom not_waitlisted', async () => {
    const trainingId = await fullTraining()
    await join(pool[1], trainingId)

    expect((await leave(pool[1], trainingId)).data).toBe('ok')
    expect((await leave(pool[1], trainingId)).data).toBe('not_waitlisted')
    expect((await capacity(trainingId)).waitlist).toBe(0)
  })
})

describe('prístupové práva', () => {
  it('anon žiadnu z funkcií nezavolá', async () => {
    const trainingId = await fullTraining()
    const anon = anonClient()

    for (const name of ['join_training_waitlist', 'leave_training_waitlist', 'claim_waitlist_notifications']) {
      const { error } = await rpc(anon, name, trainingId)
      expect(error?.code, name).toBe('42501')
    }
  })

  it('prihlásený používateľ claim_waitlist_notifications nezavolá', async () => {
    const trainingId = await fullTraining()

    const { error } = await claim(pool[1], trainingId)

    expect(error?.code).toBe('42501')
  })

  it('používateľ vidí len vlastné riadky, admin všetky', async () => {
    const trainingId = await fullTraining()
    await join(pool[1], trainingId)
    await join(pool[2], trainingId)

    const own = await pool[1].from('training_waitlist').select('user_id').eq('training_id', trainingId)
    const all = await adminClient.from('training_waitlist').select('user_id').eq('training_id', trainingId)

    expect(own.data).toHaveLength(1)
    expect(own.data![0].user_id).toBe(created[1].id)
    expect(all.data).toHaveLength(2)
  })

  it('používateľ nemôže do tabuľky zapisovať priamo', async () => {
    const trainingId = await fullTraining()

    const { error } = await pool[1]
      .from('training_waitlist')
      .insert({ training_id: trainingId, user_id: created[1].id })

    expect(error?.code).toBe('42501')
  })
})

describe('upozornenie na uvoľnené miesto', () => {
  it('kým je tréning plný, claim nevráti nikoho', async () => {
    const trainingId = await fullTraining()
    await join(pool[1], trainingId)

    const { data } = await claim(admin, trainingId)

    expect(data).toEqual([])
  })

  it('po odhlásení vráti náhradníkov práve raz', async () => {
    const trainingId = await fullTraining()
    await join(pool[1], trainingId)
    await join(pool[2], trainingId)

    expect((await unregister(pool[0], trainingId)).data).toBe('ok')

    const first = await claim(admin, trainingId)
    expect(first.error).toBeNull()
    expect(first.data.map((r: { email: string }) => r.email).sort()).toEqual(
      [created[1].email, created[2].email].sort(),
    )
    expect(first.data.every((r: { name: string }) => typeof r.name === 'string')).toBe(true)

    const second = await claim(admin, trainingId)
    expect(second.data).toEqual([])
    expect((await notifiedFlags(trainingId)).every((flag) => flag !== null)).toBe(true)
  })

  it('náhradník, ktorý sa prihlási, zo zoznamu vypadne a naplnenie vynuluje príznaky', async () => {
    const trainingId = await fullTraining()
    await join(pool[1], trainingId)
    await join(pool[2], trainingId)
    await unregister(pool[0], trainingId)
    await claim(admin, trainingId)

    expect((await register(pool[1], trainingId)).data).toBe('ok')

    const { data } = await admin.from('training_waitlist').select('user_id, notified_at').eq('training_id', trainingId)
    expect(data).toHaveLength(1)
    expect(data![0].user_id).toBe(created[2].id)
    expect(data![0].notified_at).toBeNull()
  })

  it('ďalšie uvoľnenie po naplnení upozorní znova', async () => {
    const trainingId = await fullTraining()
    await join(pool[1], trainingId)
    await join(pool[2], trainingId)
    await unregister(pool[0], trainingId)
    await claim(admin, trainingId)
    await register(pool[1], trainingId)

    expect((await unregister(pool[1], trainingId)).data).toBe('ok')

    const { data } = await claim(admin, trainingId)
    expect(data.map((r: { email: string }) => r.email)).toEqual([created[2].email])
  })

  it('tréning, ktorý už prebehol, nikoho neupozorní', async () => {
    const trainingId = await training({ maxParticipants: 1, hoursFromNow: 1 })
    await register(pool[0], trainingId)
    await join(pool[1], trainingId)
    await admin
      .from('trainings')
      .update({ datetime: localIso(-1) })
      .eq('id', trainingId)
    await admin
      .from('training_registrations')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('training_id', trainingId)

    const { data } = await claim(admin, trainingId)

    expect(data).toEqual([])
  })
})

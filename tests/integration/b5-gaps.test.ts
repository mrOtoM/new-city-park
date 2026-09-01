import { afterAll, describe, expect, it } from 'vitest'

import { type TestAccount, admin, createAccount, deleteAccount, signIn } from './setup'

/**
 * Known-broken invariants that B5 must fix. They use `it.fails`, so the suite is
 * green while the gap exists and turns red the moment B5 closes it, forcing
 * whoever fixes it to flip these into ordinary assertions.
 */

const created: TestAccount[] = []

afterAll(async () => {
  for (const testAccount of created) await deleteAccount(testAccount)
})

async function account(role: Parameters<typeof createAccount>[0] = 'user') {
  const testAccount = await createAccount(role)
  created.push(testAccount)

  return testAccount
}

describe('B5: owner musí mať práva admina', () => {
  it.fails('owner vytvorí tréning cez vlastnú session', async () => {
    const owner = await account('owner')
    const client = await signIn(owner)

    const { error } = await client
      .from('trainings')
      .insert([{ type: 'kondicny', datetime: '2030-01-01T18:00:00' }])
      .select('id')
      .single()

    expect(error).toBeNull()
  })
})

describe('B5: admin musí vidieť cudzie dáta', () => {
  it.fails('admin prečíta profil iného používateľa', async () => {
    const [adminAccount, other] = [await account('admin'), await account()]
    const client = await signIn(adminAccount)

    const { data } = await client.from('users').select('id').eq('id', other.id)

    expect(data).toHaveLength(1)
  })

  // The policy on training_registrations matches 'admin' literally, so an admin
  // already passes here; only owner is locked out.
  it.fails('owner vidí registrácie iného používateľa', async () => {
    const [ownerAccount, other] = [await account('owner'), await account()]
    const training = await admin.from('trainings').select('id').order('id', { ascending: false }).limit(1).single()

    await admin.from('training_registrations').insert({ training_id: training.data!.id, user_id: other.id })

    const client = await signIn(ownerAccount)
    const { data } = await client.from('training_registrations').select('user_id').eq('user_id', other.id)

    expect(data).toHaveLength(1)
  })
})

describe('B5: chránené stĺpce public.users', () => {
  it.fails('používateľ si nezmení vlastný e-mail cez Data API', async () => {
    const user = await account()
    const client = await signIn(user)

    await client.from('users').update({ email: 'privlastnene@example.test' }).eq('id', user.id)

    const { data } = await admin.from('users').select('email').eq('id', user.id).single()

    expect(data?.email).toBe(user.email)
  })
})

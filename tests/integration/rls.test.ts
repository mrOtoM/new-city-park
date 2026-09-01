import { afterAll, describe, expect, it } from 'vitest'

import { type TestAccount, admin, anonClient, createAccount, deleteAccount, signIn } from './setup'

const created: TestAccount[] = []
const createdTrainings: number[] = []

afterAll(async () => {
  if (createdTrainings.length > 0) await admin.from('trainings').delete().in('id', createdTrainings)
  for (const testAccount of created) await deleteAccount(testAccount)
})

async function account(role: Parameters<typeof createAccount>[0] = 'user') {
  const testAccount = await createAccount(role)
  created.push(testAccount)

  return testAccount
}

function trainingPayload() {
  return { type: 'kondicny', datetime: '2030-01-01T18:00:00' }
}

describe('trainings: admin aj owner smú zapisovať', () => {
  it.each(['admin', 'owner'] as const)('%s vytvorí, upraví a zmaže tréning cez vlastnú session', async (role) => {
    const client = await signIn(await account(role))

    const inserted = await client.from('trainings').insert([trainingPayload()]).select('id').single()

    expect(inserted.error).toBeNull()
    createdTrainings.push(inserted.data!.id)

    const updated = await client.from('trainings').update({ note: 'B5' }).eq('id', inserted.data!.id)
    expect(updated.error).toBeNull()

    const deleted = await client.from('trainings').delete().eq('id', inserted.data!.id)
    expect(deleted.error).toBeNull()
  })

  it('bežný používateľ tréning nevytvorí', async () => {
    const client = await signIn(await account())

    const { error } = await client.from('trainings').insert([trainingPayload()]).select('id').single()

    expect(error).not.toBeNull()
  })
})

describe('users: admin a owner vidia cudzie profily, používateľ nie', () => {
  it.each(['admin', 'owner'] as const)('%s prečíta profil iného používateľa', async (role) => {
    const other = await account()
    const client = await signIn(await account(role))

    const { data } = await client.from('users').select('id').eq('id', other.id)

    expect(data).toHaveLength(1)
  })

  it('anon neprečíta tabuľku používateľov vôbec', async () => {
    const { error } = await anonClient().from('users').select('id').limit(1)

    expect(error?.code).toBe('42501')
  })
})

describe('registrations: admin a owner vidia cudzie registrácie', () => {
  it.each(['admin', 'owner'] as const)('%s vidí registráciu iného používateľa', async (role) => {
    const other = await account()
    const training = await admin.from('trainings').select('id').order('id', { ascending: false }).limit(1).single()

    await admin.from('training_registrations').insert({ training_id: training.data!.id, user_id: other.id })

    const client = await signIn(await account(role))
    const { data } = await client.from('training_registrations').select('user_id').eq('user_id', other.id)

    expect(data).toHaveLength(1)
  })
})

describe('chránené stĺpce public.users', () => {
  it('používateľ si nezmení e-mail: zamietnuté na úrovni grantu', async () => {
    const user = await account()
    const client = await signIn(user)

    const { error } = await client.from('users').update({ email: 'privlastnene@example.test' }).eq('id', user.id)

    expect(error?.code).toBe('42501')

    const { data } = await admin.from('users').select('email').eq('id', user.id).single()
    expect(data?.email).toBe(user.email)
  })

  it('používateľ si nezmení rolu: zamietnuté na úrovni grantu', async () => {
    const user = await account()
    const client = await signIn(user)

    const { error } = await client.from('users').update({ role: 'owner' }).eq('id', user.id)

    expect(error?.code).toBe('42501')
  })

  it('vlastné telefónne číslo zmeniť smie', async () => {
    const user = await account()
    const client = await signIn(user)

    const { error } = await client.from('users').update({ phoneNumber: '+421900123456' }).eq('id', user.id)

    expect(error).toBeNull()

    const { data } = await admin.from('users').select('phoneNumber').eq('id', user.id).single()
    expect(data?.phoneNumber).toBe('+421900123456')
  })
})

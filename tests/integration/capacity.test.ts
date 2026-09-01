import { afterAll, describe, expect, it } from 'vitest'

import { type TestAccount, admin, anonClient, createAccount, deleteAccount, signIn } from './setup'

const created: TestAccount[] = []

afterAll(async () => {
  for (const testAccount of created) await deleteAccount(testAccount)
})

async function account() {
  const testAccount = await createAccount()
  created.push(testAccount)

  return testAccount
}

describe('training_capacity (B4)', () => {
  it('anon pohľad neprečíta', async () => {
    const { error } = await anonClient().from('training_capacity').select('training_id').limit(1)

    expect(error?.code).toBe('42501')
  })

  it('prihlásený používateľ vidí počty za všetkých, nielen svoje', async () => {
    const user = await account()
    const client = await signIn(user)

    const [view, rows] = await Promise.all([
      client.from('training_capacity').select('training_id, active_count'),
      admin.from('training_registrations').select('training_id, cancelled_at'),
    ])

    expect(view.error).toBeNull()

    const expected: Record<number, number> = {}
    for (const row of rows.data!)
      if (!row.cancelled_at) expected[row.training_id] = (expected[row.training_id] ?? 0) + 1

    for (const row of view.data!) {
      expect(Number(row.active_count)).toBe(expected[row.training_id] ?? 0)
    }
  })

  it('používateľ vidí len vlastné registrácie', async () => {
    const user = await account()
    const client = await signIn(user)

    const { data } = await client.from('training_registrations').select('user_id')

    expect(data!.every((row) => row.user_id === user.id)).toBe(true)
  })
})

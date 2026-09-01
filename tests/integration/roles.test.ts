import { afterAll, describe, expect, it } from 'vitest'

import { type TestAccount, admin, countOwners, createAccount, deleteAccount, readRole, signIn } from './setup'

const created: TestAccount[] = []

async function account(role: Parameters<typeof createAccount>[0] = 'user', metadata = {}) {
  const testAccount = await createAccount(role, metadata)
  created.push(testAccount)

  return testAccount
}

afterAll(async () => {
  for (const testAccount of created) await deleteAccount(testAccount)
})

describe('registračný invariant (B2)', () => {
  it('nový účet dostane rolu user', async () => {
    const user = await account()

    expect(await readRole(user.id)).toBe('user')
  })

  it('rola injektovaná do metadát sa ignoruje', async () => {
    const user = await account('user', { role: 'owner', app_role: 'admin', is_admin: true })

    expect(await readRole(user.id)).toBe('user')
  })
})

describe('slovník rolí (B2)', () => {
  it.each(['superuser', 'Admin', 'root', ''])('CHECK odmietne hodnotu %s', async (role) => {
    const user = await account()

    const { error } = await admin.from('users').update({ role }).eq('id', user.id)

    expect(error?.code).toBe('23514')
    expect(await readRole(user.id)).toBe('user')
  })
})

describe('používateľ nemôže eskalovať ani čítať cudzie dáta', () => {
  it('nezmení si vlastnú rolu cez Data API', async () => {
    const user = await account()
    const client = await signIn(user)

    await client.from('users').update({ role: 'admin' }).eq('id', user.id)

    expect(await readRole(user.id)).toBe('user')
  })

  it('neprečíta cudzí profil', async () => {
    const [user, other] = [await account(), await account()]
    const client = await signIn(user)

    const { data } = await client.from('users').select('id, email').eq('id', other.id)

    expect(data).toEqual([])
  })

  it('prečíta vlastný profil', async () => {
    const user = await account()
    const client = await signIn(user)

    const { data } = await client.from('users').select('id').eq('id', user.id).single()

    expect(data?.id).toBe(user.id)
  })

  it('upraví si vlastné telefónne číslo', async () => {
    const user = await account()
    const client = await signIn(user)

    const { error } = await client.from('users').update({ phoneNumber: '+421900123456' }).eq('id', user.id)

    expect(error).toBeNull()
  })
})

describe('ochrana posledného ownera (B2)', () => {
  it('jedného z dvoch ownerov možno degradovať', async () => {
    const owner = await account('owner')

    expect(await countOwners()).toBeGreaterThan(1)

    const { error } = await admin.from('users').update({ role: 'user' }).eq('id', owner.id)

    expect(error).toBeNull()
    expect(await readRole(owner.id)).toBe('user')
  })

  it('posledného ownera nemožno degradovať', async () => {
    const owners = await admin.from('users').select('id').eq('role', 'owner')

    expect(owners.data).toHaveLength(1)

    const lastOwnerId = owners.data![0].id
    const { error } = await admin.from('users').update({ role: 'admin' }).eq('id', lastOwnerId)

    // Restore immediately if the guard ever fails, so a broken trigger cannot
    // leave the project without an owner.
    if (!error) await admin.from('users').update({ role: 'owner' }).eq('id', lastOwnerId)

    expect(error?.message).toMatch(/ownera/i)
  })

  it('posledného ownera nemožno zmazať', async () => {
    const owners = await admin.from('users').select('id').eq('role', 'owner')
    const lastOwnerId = owners.data![0].id

    const { error } = await admin.from('users').delete().eq('id', lastOwnerId)

    expect(error?.message).toMatch(/ownera/i)
    expect(await readRole(lastOwnerId)).toBe('owner')
  })
})

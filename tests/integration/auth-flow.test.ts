import { afterAll, describe, expect, it } from 'vitest'

import { signUpErrorMessage } from '@/lib/auth/messages'
import { type TestAccount, admin, anonClient, createAccount, deleteAccount } from './setup'

const created: TestAccount[] = []

afterAll(async () => {
  for (const account of created) await deleteAccount(account)
})

describe('registrácia neprezradí existujúci účet', () => {
  it('signUp na existujúcu adresu sa tvári ako úspech a nevytvorí nič', async () => {
    const account = await createAccount()
    created.push(account)

    const before = await admin.from('users').select('id', { count: 'exact', head: true })

    const { data, error } = await anonClient().auth.signUp({
      email: account.email,
      password: 'Ine-Heslo-456',
    })

    // Supabase obfuscates the response: no error, a user shape, and no identity.
    expect(error).toBeNull()
    expect(data.user).not.toBeNull()
    expect(data.user?.identities).toHaveLength(0)

    const after = await admin.from('users').select('id', { count: 'exact', head: true })
    expect(after.count).toBe(before.count)
  })

  it('pôvodné heslo zostáva platné, druhá registrácia ho neprepíše', async () => {
    const account = created[0]
    const client = anonClient()

    const withOriginal = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })

    expect(withOriginal.error).toBeNull()

    const withAttempted = await anonClient().auth.signInWithPassword({
      email: account.email,
      password: 'Ine-Heslo-456',
    })

    expect(withAttempted.error).not.toBeNull()
  })

  it('mapovanie chýb nepridá rozdiel, ktorý Supabase neurobil', () => {
    const forExisting = signUpErrorMessage({ status: 400, message: 'User already registered' })
    const forUnknown = signUpErrorMessage({ status: 400, message: 'Unexpected failure' })

    expect(forExisting).toBe(forUnknown)
  })
})

describe('obnova hesla neprezradí existujúci účet', () => {
  it('neznáma adresa nevráti chybu', async () => {
    const { error } = await anonClient().auth.resetPasswordForEmail('nikto-taky-tu-nie-je@newcitypark.sk', {
      redirectTo: 'http://localhost:3000/auth/callback?type=recovery',
    })

    expect(error).toBeNull()
  })
})

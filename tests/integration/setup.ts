import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Role } from '@/lib/auth/roles'

process.loadEnvFile('.env')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * These tests create and delete real accounts. Running them against anything
 * other than the linked development project must be impossible, not merely
 * discouraged, so the guard compares the active URL with the project ref the
 * Supabase CLI is linked to and refuses when they differ.
 */
function assertDevelopmentTarget(): string {
  if (!url || !anonKey || !serviceKey) {
    throw new Error('Chýba NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY alebo SUPABASE_SERVICE_ROLE_KEY')
  }

  let linkedRef: string

  try {
    linkedRef = readFileSync('supabase/.temp/project-ref', 'utf8').trim()
  } catch {
    throw new Error('supabase/.temp/project-ref neexistuje. Spusti `npx supabase link` na vývojový projekt.')
  }

  if (!url.includes(linkedRef)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL nie je linknutý vývojový projekt. Testy sa nespustia.')
  }

  return url
}

const targetUrl = assertDevelopmentTarget()

export const admin: SupabaseClient = createClient(targetUrl, serviceKey!, { auth: { persistSession: false } })

export function anonClient(): SupabaseClient {
  return createClient(targetUrl, anonKey!, { auth: { persistSession: false } })
}

export interface TestAccount {
  id: string
  email: string
  password: string
}

const PASSWORD = 'Test-Heslo-123'

export async function createAccount(role: Role = 'user', metadata: Record<string, unknown> = {}): Promise<TestAccount> {
  const email = `b5-${randomUUID()}@newcitypark.test`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: 'Test', last_name: 'Ucet', ...metadata },
  })

  if (error || !data.user) throw new Error(`Účet sa nepodarilo vytvoriť: ${error?.message}`)

  if (role !== 'user') {
    const { error: promoteError } = await admin.from('users').update({ role }).eq('id', data.user.id)

    if (promoteError) throw new Error(`Povýšenie na ${role} zlyhalo: ${promoteError.message}`)
  }

  return { id: data.user.id, email, password: PASSWORD }
}

export async function deleteAccount(account: TestAccount) {
  await admin.auth.admin.deleteUser(account.id)
}

/** A client carrying the account's session, so PostgreSQL sees `authenticated`. */
export async function signIn(account: TestAccount): Promise<SupabaseClient> {
  const client = createClient(targetUrl, anonKey!, { auth: { persistSession: false } })

  const { error } = await client.auth.signInWithPassword({ email: account.email, password: account.password })

  if (error) throw new Error(`Prihlásenie zlyhalo: ${error.message}`)

  return client
}

export async function readRole(userId: string): Promise<unknown> {
  const { data } = await admin.from('users').select('role').eq('id', userId).single()

  return data?.role
}

export async function countOwners(): Promise<number> {
  const { count } = await admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'owner')

  return count ?? 0
}

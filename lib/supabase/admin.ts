import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * Privileged client. It bypasses RLS, so a caller must have proved the required
 * capability through lib/auth/dal.ts before reaching this.
 *
 * Fails closed: without the secret it throws. It must never fall back to the
 * anon key, because that turns a missing secret into silent data loss instead
 * of an error.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!secret) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

  return createClient(url, secret, { auth: { persistSession: false } })
}

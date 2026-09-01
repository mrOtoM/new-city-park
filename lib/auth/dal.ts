import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AuthUserMetadata, RequestAuthorization, Session, SessionUser, UserProfileRow } from '@/lib/types'
import { toAuthResult } from './auth-result'
import { type Capability, can } from './roles'
import { DEFAULT_REDIRECT, PATHNAME_HEADER, loginPathWithNext } from './redirects'

function displayName(profile: UserProfileRow, metadata: AuthUserMetadata): string {
  if (profile.fullName) return profile.fullName

  const first = typeof metadata?.first_name === 'string' ? metadata.first_name : ''
  const last = typeof metadata?.last_name === 'string' ? metadata.last_name : ''

  return `${first} ${last}`.trim()
}

/**
 * The single source of auth state for the server. Cached per request, so one
 * render pass costs at most one identity lookup and one profile query.
 *
 * Fails closed: a missing profile, a failed profile query, or a role outside
 * the vocabulary in roles.ts denies access instead of degrading to `user`.
 */
export const auth = cache(async (): Promise<Session> => {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { status: 'unauthenticated' }

  const { data } = await supabase
    .from('users')
    .select('id, fullName, email, phoneNumber, role')
    .eq('id', user.id)
    .single()

  const profile = data as UserProfileRow | null

  // The role must come from the profile row only, never from user metadata.
  const result = toAuthResult({ userId: user.id, email: user.email ?? profile?.email, profile })

  if (result.status !== 'authenticated') return result
  if (!profile) return { status: 'denied', reason: 'missing-profile' }

  return {
    status: 'authenticated',
    user: {
      id: result.identity.userId,
      email: result.identity.email,
      role: result.identity.role,
      name: displayName(profile, user.user_metadata as AuthUserMetadata),
      phone: profile.phoneNumber ?? '',
    },
  }
})

/** Path of the current request, set by proxy.ts; absent outside its matcher. */
async function requestedPath(): Promise<string | null> {
  const headerList = await headers()

  return headerList.get(PATHNAME_HEADER)
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth()

  if (session.status !== 'authenticated') redirect(loginPathWithNext(await requestedPath()))

  return session.user
}

/**
 * Every protected entry point calls this itself. A check in a parent layout or
 * in proxy.ts does not protect a page, action, or handler invoked directly.
 */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await requireUser()

  if (!can(user.role, capability)) redirect(DEFAULT_REDIRECT)

  return user
}

export function requireAdmin(): Promise<SessionUser> {
  return requireCapability('training:manage')
}

export function requireOwner(): Promise<SessionUser> {
  return requireCapability('security:break-glass')
}

/** Route Handler variant: API callers get a status code, never an HTML redirect. */
export async function authorizeRequest(capability?: Capability): Promise<RequestAuthorization> {
  const session = await auth()

  if (session.status !== 'authenticated') {
    return { ok: false, response: Response.json({ message: 'Vyžaduje sa prihlásenie' }, { status: 401 }) }
  }

  if (capability && !can(session.user.role, capability)) {
    return { ok: false, response: Response.json({ message: 'Nedostatočné oprávnenia' }, { status: 403 }) }
  }

  return { ok: true, user: session.user }
}

/** Normatívny zdroj: docs/02-authentication-authorization-overview.md */

import { type Capability, type Role, can, parseRole } from './roles'

export interface AuthenticatedIdentity {
  userId: string
  email: string | null
  role: Role
}

export type AuthDenialReason = 'missing-profile' | 'unknown-role'

export type AuthResult =
  | { status: 'unauthenticated' }
  | { status: 'denied'; reason: AuthDenialReason }
  | { status: 'authenticated'; identity: AuthenticatedIdentity }

/** Rola smie pochádzať výlučne z riadka `public.users`, nikdy z metadát, formulára, query parametra ani claimu. */
export interface AuthResultInput {
  userId: unknown
  email?: unknown
  profile?: unknown
}

export function unauthenticated(): AuthResult {
  return { status: 'unauthenticated' }
}

export function denied(reason: AuthDenialReason): AuthResult {
  return { status: 'denied', reason }
}

export function authenticated(identity: AuthenticatedIdentity): AuthResult {
  return { status: 'authenticated', identity }
}

function readRole(profile: unknown): unknown {
  if (typeof profile !== 'object' || profile === null) return undefined

  return (profile as Record<string, unknown>).role
}

export function toAuthResult(input: AuthResultInput): AuthResult {
  const { userId, email, profile } = input

  if (typeof userId !== 'string' || userId.trim() === '') return unauthenticated()

  if (typeof profile !== 'object' || profile === null) return denied('missing-profile')

  const role = parseRole(readRole(profile))

  if (!role) return denied('unknown-role')

  return authenticated({
    userId,
    email: typeof email === 'string' && email !== '' ? email : null,
    role,
  })
}

export function isAuthenticated(result: AuthResult): result is Extract<AuthResult, { status: 'authenticated' }> {
  return result.status === 'authenticated'
}

export function authorize(result: AuthResult, capability: Capability): boolean {
  if (!isAuthenticated(result)) return false

  return can(result.identity.role, capability)
}

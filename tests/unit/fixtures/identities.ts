import type { AuthResultInput } from '@/lib/auth/auth-result'
import type { Role } from '@/lib/auth/roles'

export interface ProfileFixture {
  id: string
  email: string
  fullName: string | null
  role: string
  phoneNumber: string | null
}

const IDS: Record<Role, string> = {
  user: '00000000-0000-4000-8000-000000000001',
  admin: '00000000-0000-4000-8000-000000000002',
  owner: '00000000-0000-4000-8000-000000000003',
}

export function profileFixture(role: Role, overrides: Partial<ProfileFixture> = {}): ProfileFixture {
  return {
    id: IDS[role],
    email: `${role}@example.test`,
    fullName: `Testovací ${role}`,
    role,
    phoneNumber: null,
    ...overrides,
  }
}

export function anonymousInput(): AuthResultInput {
  return { userId: null, email: null, profile: null }
}

export function identityInput(role: Role, overrides: Partial<ProfileFixture> = {}): AuthResultInput {
  const profile = profileFixture(role, overrides)

  return { userId: profile.id, email: profile.email, profile }
}

export function brokenRoleInput(role: unknown): AuthResultInput {
  return { userId: IDS.user, email: 'broken@example.test', profile: { ...profileFixture('user'), role } }
}

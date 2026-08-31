import { describe, expect, it } from 'vitest'

import {
  CAPABILITIES,
  ROLE_CAPABILITIES,
  ROLES,
  type Capability,
  type Role,
  can,
  hasAdminCapabilities,
  hasOwnerCapabilities,
} from '@/lib/auth/roles'

const MATRIX: Record<Capability, Record<Role, boolean>> = {
  'training:view': { user: true, admin: true, owner: true },
  'training:register': { user: true, admin: true, owner: true },
  'profile:read-own': { user: true, admin: true, owner: true },
  'profile:update-own': { user: true, admin: true, owner: true },
  'training:manage': { user: false, admin: true, owner: true },
  'participants:view': { user: false, admin: true, owner: true },
  'statistics:view': { user: false, admin: true, owner: true },
  'security:break-glass': { user: false, admin: false, owner: true },
  'role:assign': { user: false, admin: false, owner: false },
}

describe('matica kapabilít', () => {
  const cases = CAPABILITIES.flatMap((capability) =>
    ROLES.map((role) => [role, capability, MATRIX[capability][role]] as const),
  )

  it.each(cases)('%s → %s = %s', (role, capability, expected) => {
    expect(can(role, capability)).toBe(expected)
  })

  it('pokrýva každú definovanú kapabilitu', () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...CAPABILITIES].sort())
  })
})

describe('hranice rolí', () => {
  it('user nedostane admin ani owner kapability', () => {
    expect(hasAdminCapabilities('user')).toBe(false)
    expect(hasOwnerCapabilities('user')).toBe(false)
  })

  it('admin dostane admin kapability, ale nie owner-only', () => {
    expect(hasAdminCapabilities('admin')).toBe(true)
    expect(hasOwnerCapabilities('admin')).toBe(false)
  })

  it('owner dostane admin kapability aj schválené owner-only', () => {
    expect(hasAdminCapabilities('owner')).toBe(true)
    expect(hasOwnerCapabilities('owner')).toBe(true)
  })

  it('owner zdedí každú admin kapabilitu', () => {
    for (const capability of ROLE_CAPABILITIES.admin) {
      expect(can('owner', capability)).toBe(true)
    }
  })

  it('žiadna rola nesmie priraďovať role', () => {
    for (const role of ROLES) {
      expect(can(role, 'role:assign')).toBe(false)
      expect(ROLE_CAPABILITIES[role] as readonly Capability[]).not.toContain('role:assign')
    }
  })
})

describe('neznáme a podvrhnuté role', () => {
  const untrusted: unknown[] = [null, undefined, '', 'Admin', 'owner ', 'service_role', 0, {}, ['owner']]

  it.each(CAPABILITIES)('neznáma rola nedostane %s', (capability) => {
    for (const value of untrusted) {
      expect(can(value, capability)).toBe(false)
    }
  })

  it('service-role kľúč nie je aplikačná rola', () => {
    expect(hasAdminCapabilities('service_role')).toBe(false)
    expect(hasOwnerCapabilities('service_role')).toBe(false)
  })
})

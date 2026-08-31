import { describe, expect, it } from 'vitest'

import { ROLES, type Role, isRole, parseRole } from '@/lib/auth/roles'

describe('parseRole', () => {
  it.each(ROLES)('prijme platnú rolu %s', (role) => {
    expect(parseRole(role)).toBe(role)
  })

  const rejected: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['prázdny reťazec', ''],
    ['medzery', '   '],
    ['veľké písmeno', 'Admin'],
    ['veľké písmená', 'OWNER'],
    ['rola s medzerami', ' admin '],
    ['neznámy reťazec', 'superadmin'],
    ['podobný reťazec', 'administrator'],
    ['číslo', 1],
    ['boolean', true],
    ['pole', ['admin']],
    ['objekt', { role: 'admin' }],
    ['funkcia', () => 'admin'],
    ['prototypový kľúč', 'constructor'],
  ]

  it.each(rejected)('odmietne %s a nedegraduje na user', (_label, value) => {
    expect(parseRole(value)).toBeNull()
  })

  it('nikdy nevracia user ako náhradu za neznámu rolu', () => {
    expect(parseRole('hacker')).not.toBe('user')
  })
})

describe('isRole', () => {
  it('zúži typ len pre platné hodnoty', () => {
    const value: unknown = 'owner'

    expect(isRole(value)).toBe(true)

    if (isRole(value)) {
      const role: Role = value
      expect(role).toBe('owner')
    }

    expect(isRole('root')).toBe(false)
  })
})

describe('kontrakt zoznamu rolí', () => {
  it('obsahuje presne tri role', () => {
    expect(ROLES).toEqual(['user', 'admin', 'owner'])
  })

  it('neobsahuje service-role ako aplikačnú rolu', () => {
    expect(ROLES as readonly string[]).not.toContain('service_role')
    expect(parseRole('service_role')).toBeNull()
  })
})

/** Normatívny zdroj: docs/02-authentication-authorization-overview.md */

export const ROLES = ['user', 'admin', 'owner'] as const

export type Role = (typeof ROLES)[number]

/** Neznámu rolu musí volajúci odmietnuť, nie ju degradovať na `user`. */
export function parseRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null

  return (ROLES as readonly string[]).includes(value) ? (value as Role) : null
}

export function isRole(value: unknown): value is Role {
  return parseRole(value) !== null
}

export const CAPABILITIES = [
  'training:view',
  'training:register',
  'profile:read-own',
  'profile:update-own',
  'training:manage',
  'participants:view',
  'statistics:view',
  'users:view',
  'security:break-glass',
  'role:assign',
] as const

export type Capability = (typeof CAPABILITIES)[number]

const USER_CAPABILITIES = [
  'training:view',
  'training:register',
  'profile:read-own',
  'profile:update-own',
] as const satisfies readonly Capability[]

const ADMIN_ONLY_CAPABILITIES = ['training:manage', 'participants:view'] as const satisfies readonly Capability[]

/** Statistics are owner-only by product decision: an admin runs trainings, an owner sees the numbers. */
const OWNER_ONLY_CAPABILITIES = [
  'statistics:view',
  'users:view',
  'security:break-glass',
] as const satisfies readonly Capability[]

/** `role:assign` nesmie pribudnúť: priradenie roly je manuálna DB operácia. */
export const ROLE_CAPABILITIES = {
  user: USER_CAPABILITIES,
  admin: [...USER_CAPABILITIES, ...ADMIN_ONLY_CAPABILITIES],
  owner: [...USER_CAPABILITIES, ...ADMIN_ONLY_CAPABILITIES, ...OWNER_ONLY_CAPABILITIES],
} as const satisfies Record<Role, readonly Capability[]>

export function can(role: unknown, capability: Capability): boolean {
  const parsed = parseRole(role)

  if (!parsed) return false

  return (ROLE_CAPABILITIES[parsed] as readonly Capability[]).includes(capability)
}

export function hasAdminCapabilities(role: unknown): boolean {
  return can(role, 'training:manage')
}

export function hasOwnerCapabilities(role: unknown): boolean {
  return can(role, 'security:break-glass')
}

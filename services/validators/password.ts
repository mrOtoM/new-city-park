export const PASSWORD_RULE = 'Heslo musí mať aspoň 8 znakov, malé písmeno, veľké písmeno a číslicu'

const RULES = [
  (value: string) => value.length >= 8,
  (value: string) => /[a-z]/.test(value),
  (value: string) => /[A-Z]/.test(value),
  (value: string) => /[0-9]/.test(value),
]

/** Returns a Slovak message, or null when the password is acceptable. */
export function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string') return PASSWORD_RULE

  return RULES.every((rule) => rule(value)) ? null : PASSWORD_RULE
}

export function validatePasswordPair(password: unknown, confirmation: unknown): string | null {
  if (password !== confirmation) return 'Heslá sa nezhodujú'

  return validatePassword(password)
}

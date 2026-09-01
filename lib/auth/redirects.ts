export const DEFAULT_REDIRECT = '/calendar'
export const LOGIN_PATH = '/login'

/** Set by proxy.ts so the DAL knows where to return after login. */
export const PATHNAME_HEADER = 'x-pathname'

const isControlChar = (char: string) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f

// `//host` and `/\host` are same-origin only by syntax; browsers treat both as another host.
const isOffOrigin = (value: string) => !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')

/** Accepts a same-origin absolute path only; anything else falls back. */
export function safeNextPath(value: unknown, fallback: string = DEFAULT_REDIRECT): string {
  if (typeof value !== 'string' || value === '' || isOffOrigin(value)) return fallback
  if ([...value].some(isControlChar)) return fallback
  // The login page itself would loop after a successful sign-in.
  if (value === LOGIN_PATH || value.startsWith(`${LOGIN_PATH}?`) || value.startsWith(`${LOGIN_PATH}/`)) return fallback

  return value
}

export function loginPathWithNext(value: unknown): string {
  const next = safeNextPath(value, '')

  return next === '' ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`
}

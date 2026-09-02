import { PASSWORD_RULE } from '@/services/validators/password'

/**
 * Slovak copy for auth failures. Nothing here may reveal whether an account
 * exists: signup and password reset must read the same for a known and an
 * unknown address.
 */
export const AUTH_MESSAGES = {
  rateLimited: 'Príliš veľa pokusov, skúste to o chvíľu znova',
  invalidCredentials: 'Nesprávne prihlasovacie údaje',
  invalidEmail: 'Neplatná emailová adresa',
  password: PASSWORD_RULE,
  signUpFailed: 'Registráciu sa nepodarilo dokončiť, skúste to znova',
  resetFailed: 'Email sa nepodarilo odoslať, skúste to znova',
  passwordChangeFailed: 'Heslo sa nepodarilo zmeniť, skúste to znova',
  googleFailed: 'Nepodarilo sa prihlásiť cez Google',
  misconfigured: 'Prihlásenie je momentálne nedostupné',
} as const

export interface AuthErrorLike {
  status?: number
  message?: string
}

function isRateLimited(error: AuthErrorLike): boolean {
  return error.status === 429 || (error.message ?? '').toLowerCase().includes('rate limit')
}

/** One message for every credential failure, so a wrong email reads like a wrong password. */
export function signInErrorMessage(error: AuthErrorLike): string {
  return isRateLimited(error) ? AUTH_MESSAGES.rateLimited : AUTH_MESSAGES.invalidCredentials
}

export function signUpErrorMessage(error: AuthErrorLike): string {
  if (isRateLimited(error)) return AUTH_MESSAGES.rateLimited

  const message = (error.message ?? '').toLowerCase()

  if (message.includes('email address') && message.includes('invalid')) return AUTH_MESSAGES.invalidEmail
  if (message.includes('password')) return AUTH_MESSAGES.password

  // Anything else, including "already registered", stays generic on purpose.
  return AUTH_MESSAGES.signUpFailed
}

export function resetErrorMessage(error: AuthErrorLike): string {
  return isRateLimited(error) ? AUTH_MESSAGES.rateLimited : AUTH_MESSAGES.resetFailed
}

import { describe, expect, it } from 'vitest'

import { AUTH_MESSAGES, resetErrorMessage, signInErrorMessage, signUpErrorMessage } from '@/lib/auth/messages'
import { PASSWORD_RULE, validatePassword, validatePasswordPair } from '@/services/validators/password'

describe('neprezrádzanie existencie účtu', () => {
  const existing = { status: 400, message: 'User already registered' }
  const fresh = { status: 400, message: 'Something else went wrong' }

  it('registrácia hlási to isté pre existujúcu aj neznámu adresu', () => {
    expect(signUpErrorMessage(existing)).toBe(signUpErrorMessage(fresh))
    expect(signUpErrorMessage(existing)).toBe(AUTH_MESSAGES.signUpFailed)
  })

  it('žiadna správa neobsahuje slovo o registrovanom účte', () => {
    for (const message of Object.values(AUTH_MESSAGES)) {
      expect(message.toLowerCase()).not.toContain('zaregistrovan')
      expect(message.toLowerCase()).not.toContain('neexistuje')
    }
  })

  it('prihlásenie nerozlišuje zlý e-mail a zlé heslo', () => {
    expect(signInErrorMessage({ status: 400, message: 'Invalid login credentials' })).toBe(
      AUTH_MESSAGES.invalidCredentials,
    )
    expect(signInErrorMessage({ status: 400, message: 'Email not found' })).toBe(AUTH_MESSAGES.invalidCredentials)
  })

  it('obnova hesla je generická', () => {
    expect(resetErrorMessage({ status: 500, message: 'user not found' })).toBe(AUTH_MESSAGES.resetFailed)
  })
})

describe('rate limit má vlastnú správu v každom toku', () => {
  const limited = { status: 429, message: 'Request rate limit reached' }

  it.each([
    ['prihlásenie', signInErrorMessage],
    ['registrácia', signUpErrorMessage],
    ['obnova hesla', resetErrorMessage],
  ])('%s', (_label, map) => {
    expect(map(limited)).toBe(AUTH_MESSAGES.rateLimited)
  })

  it('rozpozná limit aj bez stavového kódu', () => {
    expect(signInErrorMessage({ message: 'Request rate limit reached' })).toBe(AUTH_MESSAGES.rateLimited)
  })
})

describe('signUpErrorMessage rozlíši len to, čo je bezpečné', () => {
  it('neplatná adresa', () => {
    expect(signUpErrorMessage({ status: 400, message: 'Email address "x@y.test" is invalid' })).toBe(
      AUTH_MESSAGES.invalidEmail,
    )
  })

  it('slabé heslo', () => {
    expect(signUpErrorMessage({ status: 422, message: 'Password should be at least 8 characters' })).toBe(PASSWORD_RULE)
  })
})

describe('validatePassword', () => {
  it('prijme vyhovujúce heslo', () => {
    expect(validatePassword('Testovacie1')).toBeNull()
  })

  it.each([
    ['krátke', 'Test1a'],
    ['bez veľkého písmena', 'testovacie1'],
    ['bez malého písmena', 'TESTOVACIE1'],
    ['bez číslice', 'Testovacieheslo'],
    ['nie je reťazec', 42],
  ])('odmietne %s', (_label, value) => {
    expect(validatePassword(value)).toBe(PASSWORD_RULE)
  })

  it('nezhodné heslá majú vlastnú správu', () => {
    expect(validatePasswordPair('Testovacie1', 'Testovacie2')).toBe('Heslá sa nezhodujú')
  })

  it('zhodné a vyhovujúce heslá prejdú', () => {
    expect(validatePasswordPair('Testovacie1', 'Testovacie1')).toBeNull()
  })
})

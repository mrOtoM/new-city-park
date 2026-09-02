import { beforeEach, describe, expect, it, vi } from 'vitest'

import { REGISTRATION_CODES, type RegistrationCode } from '@/lib/types'

const registerForTraining = vi.fn()
const unregisterFromTraining = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/dal', () => ({
  requireUser: async () => ({ id: 'u1', email: null, role: 'user', name: 'Test', phone: '' }),
  requireAdmin: async () => ({ id: 'a1', email: null, role: 'admin', name: 'Admin', phone: '' }),
}))
vi.mock('@/lib/email', () => ({ sendTrainingRegistrationEmail: vi.fn(async () => undefined) }))
vi.mock('@/services/queries/trainings', () => ({ getTraining: async () => null }))
vi.mock('@/services/queries/registrations', () => ({
  registerForTraining,
  unregisterFromTraining,
  removeParticipantByAdmin: vi.fn(),
}))

async function importActions() {
  return import('@/services/actions/registrations')
}

const FAILURE_CODES = REGISTRATION_CODES.filter((code): code is Exclude<RegistrationCode, 'ok'> => code !== 'ok')

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  registerForTraining.mockReset()
  unregisterFromTraining.mockReset()
})

describe('registerForTrainingAction', () => {
  it('kód ok je úspech', async () => {
    registerForTraining.mockResolvedValue('ok')
    const { registerForTrainingAction } = await importActions()

    expect(await registerForTrainingAction(1)).toEqual({ ok: true })
  })

  it.each(FAILURE_CODES)('kód %s vráti čitateľnú správu, nehodí výnimku', async (code) => {
    registerForTraining.mockResolvedValue(code)
    const { registerForTrainingAction } = await importActions()

    const result = await registerForTrainingAction(1)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message.length).toBeGreaterThan(3)
  })

  it('každý kód má vlastnú správu', async () => {
    const { registerForTrainingAction } = await importActions()
    const messages = new Set<string>()

    for (const code of FAILURE_CODES) {
      registerForTraining.mockResolvedValue(code)
      const result = await registerForTrainingAction(1)

      if (!result.ok) messages.add(result.message)
    }

    expect(messages.size).toBe(FAILURE_CODES.length)
  })
})

describe('unregisterFromTrainingAction', () => {
  it('kód ok je úspech', async () => {
    unregisterFromTraining.mockResolvedValue('ok')
    const { unregisterFromTrainingAction } = await importActions()

    expect(await unregisterFromTrainingAction(1)).toEqual({ ok: true })
  })

  it('neúspech nerevaliduje stránky', async () => {
    unregisterFromTraining.mockResolvedValue('deadline_passed')
    const { revalidatePath } = await import('next/cache')
    const { unregisterFromTrainingAction } = await importActions()

    await unregisterFromTrainingAction(1)

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

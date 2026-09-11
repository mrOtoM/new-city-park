import { beforeEach, describe, expect, it, vi } from 'vitest'

const claimWaitlistNotifications = vi.fn()
const sendWaitlistSpotOpenedEmails = vi.fn(async (..._args: unknown[]) => undefined)
const getTraining = vi.fn()
const training = { id: 7, type: 'kondicny', datetime: '2030-01-01T18:00:00', unregisterDeadline: null }

vi.mock('server-only', () => ({}))
vi.mock('@/lib/email', () => ({ sendWaitlistSpotOpenedEmails }))
vi.mock('@/services/queries/trainings', () => ({ getTraining }))
vi.mock('@/services/queries/registrations', () => ({ claimWaitlistNotifications }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  getTraining.mockResolvedValue(training)
})

describe('notifyWaitlist', () => {
  it('bez čakajúcich neposiela nič a tréning ani nečíta', async () => {
    claimWaitlistNotifications.mockResolvedValue([])
    const { notifyWaitlist } = await import('@/services/actions/waitlist-notifications')

    await notifyWaitlist(7)

    expect(sendWaitlistSpotOpenedEmails).not.toHaveBeenCalled()
    expect(getTraining).not.toHaveBeenCalled()
  })

  it('pošle jeden hromadný e-mail všetkým, ktorých databáza vrátila', async () => {
    const recipients = [
      { name: 'Jana', email: 'jana@example.test' },
      { name: 'Peter', email: 'peter@example.test' },
    ]
    claimWaitlistNotifications.mockResolvedValue(recipients)
    const { notifyWaitlist } = await import('@/services/actions/waitlist-notifications')

    await notifyWaitlist(7)

    expect(sendWaitlistSpotOpenedEmails).toHaveBeenCalledTimes(1)
    const [sentTo, label] = sendWaitlistSpotOpenedEmails.mock.calls[0]
    expect(sentTo).toEqual(recipients)
    expect(typeof label).toBe('string')
  })

  it('nevracia príjemcov volajúcemu', async () => {
    claimWaitlistNotifications.mockResolvedValue([{ name: 'Jana', email: 'jana@example.test' }])
    const { notifyWaitlist } = await import('@/services/actions/waitlist-notifications')

    await expect(notifyWaitlist(7)).resolves.toBeUndefined()
  })

  it('zlyhanie odosielania operáciu nezhodí', async () => {
    claimWaitlistNotifications.mockResolvedValue([{ name: 'Jana', email: 'jana@example.test' }])
    sendWaitlistSpotOpenedEmails.mockRejectedValueOnce(new Error('Resend down'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { notifyWaitlist } = await import('@/services/actions/waitlist-notifications')

    await expect(notifyWaitlist(7)).resolves.toBeUndefined()
  })
})

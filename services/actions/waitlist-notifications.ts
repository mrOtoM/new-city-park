import 'server-only'

import { TRAINING_TYPES } from '@/lib/constants'
import { sendWaitlistSpotOpenedEmails } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { claimWaitlistNotifications } from '@/services/queries/registrations'
import { getTraining } from '@/services/queries/trainings'

/**
 * Not a Server Action on purpose: this file carries no 'use server', so the
 * function cannot be invoked from a client. It runs only inside an action,
 * after that action's own guarded write succeeded.
 *
 * Called after every write that can free a spot. The database decides whether
 * one actually opened and whom to tell, so the caller needs no before/after
 * comparison. Fire-and-forget like the other mails.
 */
export async function notifyWaitlist(trainingId: number) {
  const recipients = await claimWaitlistNotifications(trainingId)

  if (recipients.length === 0) return

  const training = await getTraining(trainingId)

  if (!training) return

  const typeLabel = TRAINING_TYPES.find((t) => t.value === training.type)?.label || 'Tréning'

  sendWaitlistSpotOpenedEmails(recipients, typeLabel, formatDate(training.datetime, 'd. MMMM yyyy, HH:mm')).catch(
    console.error,
  )
}

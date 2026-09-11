'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin, requireUser } from '@/lib/auth/dal'
import { TRAINING_TYPES } from '@/lib/constants'
import { sendTrainingRegistrationEmail, sendTrainingUnregistrationEmail } from '@/lib/email'
import type { ActionResult, ParticipantContact, RegistrationCode } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { notifyWaitlist } from '@/services/actions/waitlist-notifications'
import { getTraining } from '@/services/queries/trainings'
import {
  joinTrainingWaitlist,
  leaveTrainingWaitlist,
  registerForTraining,
  removeParticipantByAdmin,
  unregisterFromTraining,
} from '@/services/queries/registrations'

/** Every code the database can return, so a new one cannot be added silently. */
const MESSAGES: Record<Exclude<RegistrationCode, 'ok'>, string> = {
  unauthenticated: 'Prihlásenie vypršalo, prihlás sa znova',
  not_found: 'Tréning sa nenašiel',
  past: 'Tréning už prebehol',
  already_registered: 'Už si prihlásený na tento tréning',
  full: 'Tréning je už plne obsadený',
  deadline_passed: 'Odhlásenie už nie je možné, termín prešiel',
  not_registered: 'Na tento tréning nie si prihlásený',
  not_full: 'Tréning má voľné miesto, prihlás sa priamo',
  already_waitlisted: 'Už si náhradník na tomto tréningu',
  waitlist_full: 'Zoznam náhradníkov je už plný',
  not_waitlisted: 'Nie si náhradník na tomto tréningu',
}

function toResult(code: RegistrationCode): ActionResult {
  return code === 'ok' ? { ok: true } : { ok: false, message: MESSAGES[code] }
}

function revalidateTrainingViews() {
  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

export async function registerForTrainingAction(trainingId: number): Promise<ActionResult> {
  const user = await requireUser()
  const result = toResult(await registerForTraining(trainingId))

  if (!result.ok) return result

  const training = await getTraining(trainingId)

  if (training && user.email) {
    const typeLabel = TRAINING_TYPES.find((t) => t.value === training.type)?.label || 'Tréning'
    const datetimeStr = formatDate(training.datetime, 'd. MMMM yyyy, HH:mm')
    const deadlineStr = training.unregisterDeadline
      ? formatDate(String(training.unregisterDeadline), 'd. MMMM yyyy, HH:mm')
      : null

    sendTrainingRegistrationEmail(
      { name: user.name || 'športovec', email: user.email },
      typeLabel,
      datetimeStr,
      deadlineStr,
    ).catch(console.error)
  }

  revalidateTrainingViews()

  return result
}

export async function unregisterFromTrainingAction(trainingId: number): Promise<ActionResult> {
  const user = await requireUser()
  const result = toResult(await unregisterFromTraining(trainingId))

  if (!result.ok) return result

  await notifyUnregistered(trainingId, { name: user.name, email: user.email })
  await notifyWaitlist(trainingId)

  revalidateTrainingViews()

  return result
}

export async function joinWaitlistAction(trainingId: number): Promise<ActionResult> {
  await requireUser()
  const result = toResult(await joinTrainingWaitlist(trainingId))

  if (result.ok) revalidateTrainingViews()

  return result
}

export async function leaveWaitlistAction(trainingId: number): Promise<ActionResult> {
  await requireUser()
  const result = toResult(await leaveTrainingWaitlist(trainingId))

  if (result.ok) revalidateTrainingViews()

  return result
}

export async function removeParticipantAction(trainingId: number, userId: string) {
  await requireAdmin()

  if (!Number.isInteger(trainingId)) throw new Error('Neplatné ID tréningu')
  if (!userId) throw new Error('Neplatné ID účastníka')

  // The unregister deadline binds the participant only, not an admin.
  const participant = await removeParticipantByAdmin(trainingId, userId)

  await notifyUnregistered(trainingId, participant, { byAdmin: true })
  await notifyWaitlist(trainingId)

  revalidatePath(`/trainings/${trainingId}/edit`)
  revalidateTrainingViews()
}

/** Fire-and-forget, exactly like the registration mail: a failed send must not fail the action. */
async function notifyUnregistered(
  trainingId: number,
  participant: ParticipantContact,
  options: { byAdmin?: boolean } = {},
) {
  if (!participant.email) return

  const training = await getTraining(trainingId)

  if (!training) return

  const typeLabel = TRAINING_TYPES.find((t) => t.value === training.type)?.label || 'Tréning'

  sendTrainingUnregistrationEmail(
    { name: participant.name || 'športovec', email: participant.email },
    typeLabel,
    formatDate(training.datetime, 'd. MMMM yyyy, HH:mm'),
    options,
  ).catch(console.error)
}

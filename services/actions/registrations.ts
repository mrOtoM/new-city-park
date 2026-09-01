'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin, requireUser } from '@/lib/auth/dal'
import { TRAINING_TYPES } from '@/lib/constants'
import { sendTrainingRegistrationEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { getTraining } from '@/services/queries/trainings'
import { registerForTraining, removeParticipantByAdmin, unregisterFromTraining } from '@/services/queries/registrations'

export async function registerForTrainingAction(trainingId: number) {
  const user = await requireUser()

  await registerForTraining(trainingId, user.id)

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

  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

export async function unregisterFromTrainingAction(trainingId: number) {
  const user = await requireUser()

  const training = await getTraining(trainingId)

  if (training?.unregisterDeadline && new Date() > new Date(String(training.unregisterDeadline))) {
    throw new Error('Odhlásenie už nie je možné – deadline prešiel')
  }

  await unregisterFromTraining(trainingId, user.id)

  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

export async function removeParticipantAction(trainingId: number, userId: string) {
  await requireAdmin()

  if (!Number.isInteger(trainingId)) throw new Error('Neplatné ID tréningu')
  if (!userId) throw new Error('Neplatné ID účastníka')

  // The unregister deadline binds the participant only, not an admin.
  await removeParticipantByAdmin(trainingId, userId)

  revalidatePath(`/trainings/${trainingId}/edit`)
  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

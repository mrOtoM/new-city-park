'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/lib/auth/dal'
import { hasAdminCapabilities } from '@/lib/auth/roles'
import { TRAINING_TYPES } from '@/lib/constants'
import { sendTrainingRegistrationEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { getTraining } from '@/services/queries/trainings'
import { registerForTraining, removeParticipantByAdmin, unregisterFromTraining } from '@/services/queries/registrations'

export async function registerForTrainingAction(trainingId: number) {
  const session = await auth()

  if (!session?.user?.id) throw new Error('Unauthorized')

  await registerForTraining(trainingId, session.user.id)

  const training = await getTraining(trainingId)

  if (training && session.user.email) {
    const typeLabel = TRAINING_TYPES.find((t) => t.value === training.type)?.label || 'Tréning'
    const datetimeStr = formatDate(training.datetime, 'd. MMMM yyyy, HH:mm')
    const deadlineStr = training.unregisterDeadline
      ? formatDate(String(training.unregisterDeadline), 'd. MMMM yyyy, HH:mm')
      : null

    sendTrainingRegistrationEmail(
      { name: session.user.name || 'športovec', email: session.user.email },
      typeLabel,
      datetimeStr,
      deadlineStr,
    ).catch(console.error)
  }

  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

export async function unregisterFromTrainingAction(trainingId: number) {
  const session = await auth()

  if (!session?.user?.id) throw new Error('Unauthorized')

  const training = await getTraining(trainingId)

  if (training?.unregisterDeadline && new Date() > new Date(String(training.unregisterDeadline))) {
    throw new Error('Odhlásenie už nie je možné – deadline prešiel')
  }

  await unregisterFromTraining(trainingId, session.user.id)

  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

export async function removeParticipantAction(trainingId: number, userId: string) {
  const session = await auth()

  if (!hasAdminCapabilities(session?.user?.role)) throw new Error('Unauthorized')
  if (!Number.isInteger(trainingId)) throw new Error('Neplatné ID tréningu')
  if (!userId) throw new Error('Neplatné ID účastníka')

  // Admin odhlasuje aj po uplynutí deadlinu; ten viaže len samotného účastníka.
  await removeParticipantByAdmin(trainingId, userId)

  revalidatePath(`/trainings/${trainingId}/edit`)
  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

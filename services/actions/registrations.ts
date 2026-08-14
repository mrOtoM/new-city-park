'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/lib/auth/dal'
import { getTraining } from '@/services/queries/trainings'
import { registerForTraining, unregisterFromTraining } from '@/services/queries/registrations'

export async function registerForTrainingAction(trainingId: number) {
  const session = await auth()

  if (!session?.user?.id) throw new Error('Unauthorized')

  await registerForTraining(trainingId, session.user.id)

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

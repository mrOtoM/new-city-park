'use server'

import { auth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createTraining, updateTraining, deleteTraining } from '@/services/trainings'
import { registerForTraining, unregisterFromTraining } from '@/services/registrations'
import { buildDeadlineISO, computeDeadlineFromTraining, formatDate } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function createTrainingAction(formData: FormData) {
  const session = await auth()

  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const type = formData.get('type') as string
  const datetime = buildDeadlineISO(
    formData.get('date') as string,
    formData.get('time') as string,
  )!
  const note = (formData.get('note') as string) || undefined
  const minParticipants = formData.get('minParticipants')
    ? Number(formData.get('minParticipants'))
    : undefined
  const maxParticipants = formData.get('maxParticipants')
    ? Number(formData.get('maxParticipants'))
    : undefined
  const deadlineHours = formData.get('unregisterDeadlineHours') as string
  const unregisterDeadline = deadlineHours
    ? computeDeadlineFromTraining(datetime, Number(deadlineHours))
    : null

  await createTraining({ type, datetime, note, minParticipants, maxParticipants, unregisterDeadline })

  revalidatePath('/trainings')
  redirect('/trainings')
}

export async function updateTrainingAction(formData: FormData) {
  const session = await auth()

  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const id = Number(formData.get('id'))
  const type = formData.get('type') as string
  const datetime = buildDeadlineISO(
    formData.get('date') as string,
    formData.get('time') as string,
  )!
  const note = (formData.get('note') as string) || null
  const minParticipants = formData.get('minParticipants')
    ? Number(formData.get('minParticipants'))
    : null
  const maxParticipants = formData.get('maxParticipants')
    ? Number(formData.get('maxParticipants'))
    : null
  const deadlineHoursUpdate = formData.get('unregisterDeadlineHours') as string
  const unregisterDeadline = deadlineHoursUpdate
    ? computeDeadlineFromTraining(datetime, Number(deadlineHoursUpdate))
    : null

  await updateTraining(id, { type, datetime, note, minParticipants, maxParticipants, unregisterDeadline })

  revalidatePath('/trainings')
  redirect('/trainings')
}

export async function deleteTrainingAction(trainingId: number) {
  const session = await auth()
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')

  const { getTraining } = await import('@/services/trainings')
  const { getTrainingParticipants } = await import('@/services/registrations')
  const { sendTrainingCancelledEmails } = await import('@/lib/email')
  const { TRAINING_TYPES } = await import('@/lib/constants')

  const [training, participants] = await Promise.all([
    getTraining(trainingId),
    getTrainingParticipants(trainingId),
  ])

  await deleteTraining(trainingId)

  if (training && participants.active.length > 0) {
    const typeLabel = TRAINING_TYPES.find((t) => t.value === training.type)?.label || 'Tréning'
    const datetimeStr = formatDate(training.datetime, 'd. MMMM yyyy, HH:mm')
    const emailRecipients = participants.active
      .filter((p) => p.email && p.email !== '–')
      .map((p) => ({ name: p.name, email: p.email }))

    await sendTrainingCancelledEmails(emailRecipients, typeLabel, datetimeStr)
  }

  revalidatePath('/trainings')
  revalidatePath('/calendar')
  redirect('/trainings')
}

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

  const { getTraining } = await import('@/services/trainings')
  const training = await getTraining(trainingId)
  if (training?.unregisterDeadline && new Date() > new Date(String(training.unregisterDeadline))) {
    throw new Error('Odhlásenie už nie je možné – deadline prešiel')
  }

  await unregisterFromTraining(trainingId, session.user.id)
  revalidatePath('/calendar')
  revalidatePath('/trainings')
}

export async function updatePhoneAction(phone: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const { supabaseAdmin } = await import('@/lib/supabase')

  const { error } = await supabaseAdmin
    .from('users')
    .update({ phoneNumber: phone })
    .eq('id', session.user.id)

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa aktualizovať telefónne číslo')
  }

  revalidatePath('/profile')
}

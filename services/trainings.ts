'use server'

import { supabase, supabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { getTrainingParticipants } from '@/services/registrations'
import { sendTrainingCancelledEmails } from '@/lib/email'
import { TRAINING_TYPES } from '@/lib/constants'
import { buildDeadlineISO, computeDeadlineFromTraining, formatDate } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

export async function getTrainings() {
  const { data, error } = await supabase
    .from('trainings')
    .select('id, type, datetime, note, unregisterDeadline, maxParticipants')
    .order('datetime', { ascending: false })

  if (error) {
    notFound()
  }

  return data
}

export async function getTraining(id: number) {
  const { data, error } = await supabase
    .from('trainings')
    .select('id, type, datetime, note, minParticipants, maxParticipants, unregisterDeadline')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function updateTraining(
  id: number,
  updates: {
    type: string
    datetime: string
    note?: string | null
    minParticipants?: number | null
    maxParticipants?: number | null
    unregisterDeadline?: string | null
  },
) {
  const { data, error } = await supabaseAdmin
    .from('trainings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(error)
    throw new Error('Training could not be updated')
  }

  return data
}

export async function deleteTraining(id: number) {
  const { error } = await supabaseAdmin
    .from('trainings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Training could not be deleted')
  }
}

export async function createTraining(newTraining: {
  type: string
  datetime: string
  note?: string
  minParticipants?: number
  maxParticipants?: number
  unregisterDeadline?: string | null
}) {
  const { data, error } = await supabaseAdmin
    .from('trainings')
    .insert([newTraining])
    .select()
    .single()

  if (error) {
    console.error(error)
    throw new Error('Training could not be created')
  }

  return data
}

// --- Server Actions ---

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

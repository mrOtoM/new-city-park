'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth/dal'
import { TRAINING_TYPES } from '@/lib/constants'
import { sendTrainingCancelledEmails } from '@/lib/email'
import { buildDeadlineISO, computeDeadlineFromTraining, formatDate } from '@/lib/utils'
import { getTraining } from '@/services/queries/trainings'
import { getTrainingParticipants } from '@/services/queries/registrations'

function extractTrainingData(formData: FormData) {
  const type = formData.get('type') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string

  if (!type || !date || !time) throw new Error('Chýbajú povinné polia: type, date alebo time')

  const datetime = buildDeadlineISO(date, time)

  if (!datetime) throw new Error('Neplatná kombinácia dátumu a času')

  const note = (formData.get('note') as string) || null
  const minParticipants = Number(formData.get('minParticipants')) || null
  const maxParticipants = Number(formData.get('maxParticipants')) || null
  const deadlineHours = formData.get('unregisterDeadlineHours') as string
  const unregisterDeadline = deadlineHours ? computeDeadlineFromTraining(datetime, Number(deadlineHours)) : null

  return { type, datetime, note, minParticipants, maxParticipants, unregisterDeadline }
}

export async function createTrainingAction(formData: FormData) {
  const session = await auth()

  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')

  const newTraining = extractTrainingData(formData)

  const { error } = await supabaseAdmin.from('trainings').insert([newTraining])

  if (error) {
    console.error(error)
    throw new Error('Tréning sa nepodarilo vytvoriť')
  }

  revalidatePath('/trainings')
  redirect('/trainings')
}

export async function updateTrainingAction(formData: FormData) {
  const session = await auth()

  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')

  const id = Number(formData.get('id'))

  if (isNaN(id)) throw new Error('Neplatné ID tréningu')

  const updates = extractTrainingData(formData)

  const { error } = await supabaseAdmin.from('trainings').update(updates).eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Tréning sa nepodarilo upraviť')
  }

  revalidatePath('/trainings')
  redirect('/trainings')
}

export async function deleteTrainingAction(trainingId: number) {
  const session = await auth()

  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')

  const [training, participants] = await Promise.all([getTraining(trainingId), getTrainingParticipants(trainingId)])

  const { error } = await supabaseAdmin.from('trainings').delete().eq('id', trainingId)

  if (error) {
    console.error(error)
    throw new Error('Tréning sa nepodarilo vymazať')
  }

  if (training && participants.active.length > 0) {
    const typeLabel = TRAINING_TYPES.find((t) => t.value === training.type)?.label || 'Tréning'
    const datetimeStr = formatDate(training.datetime, 'd. MMMM yyyy, HH:mm')
    const emailRecipients = participants.active
      .filter((p) => p.email && p.email !== '–')
      .map((p) => ({ name: p.name, email: p.email }))

    sendTrainingCancelledEmails(emailRecipients, typeLabel, datetimeStr).catch(console.error)
  }

  revalidatePath('/trainings')
  revalidatePath('/calendar')
  redirect('/trainings')
}

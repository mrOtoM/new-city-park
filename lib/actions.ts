'use server'

import { auth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createTraining, updateTraining } from '@/services/trainings'
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
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const note = (formData.get('note') as string) || undefined
  const minParticipants = formData.get('minParticipants')
    ? Number(formData.get('minParticipants'))
    : undefined
  const maxParticipants = formData.get('maxParticipants')
    ? Number(formData.get('maxParticipants'))
    : undefined

  await createTraining({ type, date, time, note, minParticipants, maxParticipants })

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
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const note = (formData.get('note') as string) || undefined
  const minParticipants = formData.get('minParticipants')
    ? Number(formData.get('minParticipants'))
    : undefined
  const maxParticipants = formData.get('maxParticipants')
    ? Number(formData.get('maxParticipants'))
    : undefined

  await updateTraining(id, { type, date, time, note, minParticipants, maxParticipants })

  revalidatePath('/trainings')
  redirect('/trainings')
}

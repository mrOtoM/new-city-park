import { supabase, supabaseAdmin } from '@/lib/supabase'
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

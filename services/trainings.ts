import { supabase, supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export async function getTrainings() {
  const { data, error } = await supabase
    .from('trainings')
    .select('id, type, date, time, note')
    .order('date', { ascending: false })
    .order('time', { ascending: false })

  await new Promise((res) => setTimeout(res, 1000))

  if (error) {
    notFound()
  }

  return data
}

export async function getTraining(id: number) {
  const { data, error } = await supabase
    .from('trainings')
    .select('id, type, date, time, note, minParticipants, maxParticipants')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function updateTraining(
  id: number,
  updates: {
    type: string
    date: string
    time: string
    note?: string
    minParticipants?: number
    maxParticipants?: number
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

export async function createTraining(newTraining: {
  type: string
  date: string
  time: string
  note?: string
  minParticipants?: number
  maxParticipants?: number
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

import { notFound } from 'next/navigation'

import { supabase } from '@/lib/supabase'

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

'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { getTraining } from '@/services/trainings'
import { revalidatePath } from 'next/cache'

export async function registerForTraining(trainingId: number, userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: existing } = await supabase
    .from('training_registrations')
    .select('id, cancelled_at')
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .single()

  if (existing && !existing.cancelled_at) {
    throw new Error('Už si prihlásený na tento tréning')
  }

  const { data: training } = await supabaseAdmin
    .from('trainings')
    .select('maxParticipants')
    .eq('id', trainingId)
    .single()

  if (training?.maxParticipants) {
    const { count } = await supabaseAdmin
      .from('training_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('training_id', trainingId)
      .is('cancelled_at', null)

    if ((count ?? 0) >= training.maxParticipants) {
      throw new Error('Tréning je už plne obsadený')
    }
  }

  if (existing && existing.cancelled_at) {
    const { error } = await supabase
      .from('training_registrations')
      .update({ cancelled_at: null, registered_at: new Date().toISOString() })
      .eq('id', existing.id)

    if (error) {
      console.error(error)
      throw new Error('Nepodarilo sa prihlásiť na tréning')
    }
    return
  }

  const { error } = await supabase.from('training_registrations').insert({ training_id: trainingId, user_id: userId })

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa prihlásiť na tréning')
  }
}

export async function unregisterFromTraining(trainingId: number, userId: string) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('training_registrations')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .is('cancelled_at', null)

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa odhlásiť z tréningu')
  }
}

export async function getTrainingParticipants(trainingId: number) {
  const { data, error } = await supabaseAdmin
    .from('training_registrations')
    .select('registered_at, cancelled_at, user_id, users:user_id("fullName", "phoneNumber", email)')
    .eq('training_id', trainingId)
    .order('registered_at', { ascending: true })

  if (error) {
    console.error(error)
    return { active: [], cancelled: [] }
  }

  type UserJoin = { fullName: string; phoneNumber: string | null; email: string | null }

  const active = data
    .filter((r) => !r.cancelled_at)
    .map((r) => ({
      name: (r.users as unknown as UserJoin)?.fullName || 'Neznámy',
      phone: (r.users as unknown as UserJoin)?.phoneNumber || '–',
      email: (r.users as unknown as UserJoin)?.email || '–',
      registeredAt: r.registered_at,
    }))

  const cancelled = data
    .filter((r) => r.cancelled_at)
    .map((r) => ({
      name: (r.users as unknown as UserJoin)?.fullName || 'Neznámy',
      phone: (r.users as unknown as UserJoin)?.phoneNumber || '–',
      email: (r.users as unknown as UserJoin)?.email || '–',
      cancelledAt: r.cancelled_at!,
    }))

  return { active, cancelled }
}

export async function getRegistrationCounts(): Promise<Record<number, number>> {
  const { data, error } = await supabaseAdmin
    .from('training_registrations')
    .select('training_id')
    .is('cancelled_at', null)

  if (error) return {}
  const counts: Record<number, number> = {}
  for (const r of data) {
    counts[r.training_id] = (counts[r.training_id] || 0) + 1
  }
  return counts
}

export async function getUserRegistrations(userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('training_registrations')
    .select('training_id')
    .eq('user_id', userId)
    .is('cancelled_at', null)

  if (error) return []
  return data.map((r) => r.training_id)
}

// --- Server Actions ---

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

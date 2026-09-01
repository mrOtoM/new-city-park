import { requireCapability } from '@/lib/auth/dal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TrainingParticipants, UserJoin } from '@/lib/types'

function parseUserJoin(users: unknown): UserJoin | null {
  if (users && typeof users === 'object' && 'fullName' in users) {
    return users as UserJoin
  }
  return null
}

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

  const { data: capacity } = await supabase
    .from('training_capacity')
    .select('max_participants, active_count')
    .eq('training_id', trainingId)
    .single()

  if (capacity?.max_participants && capacity.active_count >= capacity.max_participants) {
    throw new Error('Tréning je už plne obsadený')
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

/**
 * Soft-cancels someone else's registration, so it verifies the capability
 * itself rather than trusting the calling page. Privileged until B5 adds an
 * admin UPDATE policy on training_registrations.
 */
export async function removeParticipantByAdmin(trainingId: number, userId: string) {
  await requireCapability('training:manage')

  const supabaseAdmin = createSupabaseAdminClient()

  const { data, error } = await supabaseAdmin
    .from('training_registrations')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .is('cancelled_at', null)
    .select('id')

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa odhlásiť účastníka')
  }

  if (!data || data.length === 0) {
    throw new Error('Účastník už nie je prihlásený na tento tréning')
  }
}

/** Returns participant PII, so it verifies the capability itself. Privileged until B5. */
export async function getTrainingParticipants(trainingId: number): Promise<TrainingParticipants> {
  await requireCapability('participants:view')

  const supabaseAdmin = createSupabaseAdminClient()

  const { data, error } = await supabaseAdmin
    .from('training_registrations')
    .select('registered_at, cancelled_at, user_id, users:user_id("fullName", "phoneNumber", email)')
    .eq('training_id', trainingId)
    .order('registered_at', { ascending: true })

  if (error) {
    console.error(error)
    return { active: [], cancelled: [] }
  }

  const active = data
    .filter((r) => !r.cancelled_at)
    .map((r) => {
      const user = parseUserJoin(r.users)
      return {
        userId: r.user_id,
        name: user?.fullName || 'Neznámy',
        phone: user?.phoneNumber || '–',
        email: user?.email || '–',
        registeredAt: r.registered_at,
      }
    })

  const cancelled = data
    .filter((r) => r.cancelled_at)
    .map((r) => {
      const user = parseUserJoin(r.users)
      return {
        userId: r.user_id,
        name: user?.fullName || 'Neznámy',
        phone: user?.phoneNumber || '–',
        email: user?.email || '–',
        cancelledAt: r.cancelled_at ?? '',
      }
    })

  return { active, cancelled }
}

export async function getRegistrationCounts(): Promise<Record<number, number>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.from('training_capacity').select('training_id, active_count')

  if (error) return {}

  const counts: Record<number, number> = {}
  for (const row of data) {
    counts[row.training_id] = row.active_count
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

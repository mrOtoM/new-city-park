import { requireCapability } from '@/lib/auth/dal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { REGISTRATION_CODES, type RegistrationCode, type TrainingParticipants, type UserJoin } from '@/lib/types'

function parseUserJoin(users: unknown): UserJoin | null {
  if (users && typeof users === 'object' && 'fullName' in users) {
    return users as UserJoin
  }
  return null
}

/**
 * Both calls delegate every rule to a database function: capacity under a row
 * lock, the training's own start time, and the unregister deadline. The acting
 * user comes from auth.uid() inside the function, never from an argument.
 */
async function callRegistrationFunction(name: string, trainingId: number): Promise<RegistrationCode> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc(name, { p_training_id: trainingId })

  if (error) {
    console.error(error)
    throw new Error('Databáza odmietla operáciu')
  }

  return isRegistrationCode(data) ? data : 'not_found'
}

function isRegistrationCode(value: unknown): value is RegistrationCode {
  return typeof value === 'string' && (REGISTRATION_CODES as readonly string[]).includes(value)
}

export function registerForTraining(trainingId: number): Promise<RegistrationCode> {
  return callRegistrationFunction('register_for_training', trainingId)
}

export function unregisterFromTraining(trainingId: number): Promise<RegistrationCode> {
  return callRegistrationFunction('unregister_from_training', trainingId)
}

/**
 * Soft-cancels someone else's registration, so it verifies the capability
 * itself rather than trusting the calling page. Still privileged: B5 added the
 * admin UPDATE policy, but moving this call to the cookie-bound client is a
 * separate change.
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

/** Returns participant PII, so it verifies the capability itself. */
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

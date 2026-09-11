import { requireCapability } from '@/lib/auth/dal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  REGISTRATION_CODES,
  type ParticipantContact,
  type RegistrationCode,
  type TrainingOccupancy,
  type TrainingParticipants,
  type UserJoin,
  type WaitlistRecipient,
} from '@/lib/types'

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

export function joinTrainingWaitlist(trainingId: number): Promise<RegistrationCode> {
  return callRegistrationFunction('join_training_waitlist', trainingId)
}

export function leaveTrainingWaitlist(trainingId: number): Promise<RegistrationCode> {
  return callRegistrationFunction('leave_training_waitlist', trainingId)
}

/**
 * Returns other users' e-mails, so it is the one privileged read on a
 * regular-user path. The database function is executable by service_role
 * only, and it marks the rows it returns, so a second call while the spot is
 * still open returns nothing. Approved as a system operation in
 * docs/02-authentication-authorization-overview.md: the caller must have
 * completed its own write first and must never return the rows to the client.
 */
export async function claimWaitlistNotifications(trainingId: number): Promise<WaitlistRecipient[]> {
  const supabaseAdmin = createSupabaseAdminClient()

  const { data, error } = await supabaseAdmin.rpc('claim_waitlist_notifications', { p_training_id: trainingId })

  if (error) {
    console.error(error)
    return []
  }

  return ((data ?? []) as { name: string | null; email: string }[]).map((row) => ({
    name: row.name || 'športovec',
    email: row.email,
  }))
}

/**
 * Soft-cancels someone else's registration, so it verifies the capability
 * itself rather than trusting the calling page. Still privileged: B5 added the
 * admin UPDATE policy, but moving this call to the cookie-bound client is a
 * separate change.
 */
export async function removeParticipantByAdmin(trainingId: number, userId: string): Promise<ParticipantContact> {
  await requireCapability('training:manage')

  const supabaseAdmin = createSupabaseAdminClient()

  const { data, error } = await supabaseAdmin
    .from('training_registrations')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .is('cancelled_at', null)
    .select('id, users:user_id("fullName", email)')

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa odhlásiť účastníka')
  }

  if (!data || data.length === 0) {
    throw new Error('Účastník už nie je prihlásený na tento tréning')
  }

  // Returned so the action can notify the person it just removed.
  const user = parseUserJoin(data[0].users)

  return { name: user?.fullName || 'športovec', email: user?.email ?? null }
}

/** Returns participant PII, so it verifies the capability itself. */
export async function getTrainingParticipants(trainingId: number): Promise<TrainingParticipants> {
  await requireCapability('participants:view')

  const supabaseAdmin = createSupabaseAdminClient()

  const [{ data, error }, waitlistResult] = await Promise.all([
    supabaseAdmin
      .from('training_registrations')
      .select('registered_at, cancelled_at, user_id, users:user_id("fullName", "phoneNumber", email)')
      .eq('training_id', trainingId)
      .order('registered_at', { ascending: true }),
    supabaseAdmin
      .from('training_waitlist')
      .select('joined_at, notified_at, user_id, users:user_id("fullName", "phoneNumber", email)')
      .eq('training_id', trainingId)
      .order('joined_at', { ascending: true }),
  ])

  if (error || waitlistResult.error) {
    console.error(error ?? waitlistResult.error)
    return { active: [], cancelled: [], waitlist: [] }
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

  const waitlist = waitlistResult.data.map((w) => {
    const user = parseUserJoin(w.users)
    return {
      userId: w.user_id,
      name: user?.fullName || 'Neznámy',
      phone: user?.phoneNumber || '–',
      email: user?.email || '–',
      joinedAt: w.joined_at,
      notifiedAt: w.notified_at,
    }
  })

  return { active, cancelled, waitlist }
}

export async function getTrainingOccupancy(): Promise<Record<number, TrainingOccupancy>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('training_capacity')
    .select('training_id, max_participants, active_count, waitlist_count, waitlist_max')

  if (error) return {}

  const occupancy: Record<number, TrainingOccupancy> = {}
  for (const row of data) {
    occupancy[row.training_id] = {
      active: row.active_count,
      max: row.max_participants,
      waitlist: row.waitlist_count,
      waitlistMax: row.waitlist_max,
    }
  }
  return occupancy
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

export async function getUserWaitlist(userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.from('training_waitlist').select('training_id').eq('user_id', userId)

  if (error) return []
  return data.map((w) => w.training_id)
}

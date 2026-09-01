import { requireCapability } from '@/lib/auth/dal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { RegistrationStat, StatisticsData, Summary, TrainingStat, TypeStat } from '@/lib/types'

function parseUserName(users: unknown) {
  if (users && typeof users === 'object' && 'fullName' in users) {
    return String((users as { fullName: string }).fullName) || 'Neznámy'
  }
  return 'Neznámy'
}

/** Reads every user's registrations and names, so it verifies the capability itself. Privileged until B5. */
export async function getStatisticsData(): Promise<StatisticsData> {
  await requireCapability('statistics:view')

  const supabaseAdmin = createSupabaseAdminClient()

  const [trainingsResult, registrationsResult] = await Promise.all([
    supabaseAdmin
      .from('trainings')
      .select('id, type, datetime, maxParticipants')
      .order('datetime', { ascending: false }),
    supabaseAdmin
      .from('training_registrations')
      .select('training_id, user_id, cancelled_at, users:user_id("fullName")')
      .order('registered_at', { ascending: true }),
  ])

  if (trainingsResult.error || registrationsResult.error) {
    console.error(trainingsResult.error ?? registrationsResult.error)
    return { trainings: [], registrations: [] }
  }

  const registrations: RegistrationStat[] = registrationsResult.data.map((registration) => ({
    trainingId: registration.training_id,
    userId: registration.user_id,
    userName: parseUserName(registration.users),
    cancelled: !!registration.cancelled_at,
  }))

  const active = new Map<number, number>()
  const cancelled = new Map<number, number>()

  for (const registration of registrations) {
    const target = registration.cancelled ? cancelled : active
    target.set(registration.trainingId, (target.get(registration.trainingId) ?? 0) + 1)
  }

  const trainings: TrainingStat[] = trainingsResult.data.map((training) => ({
    id: training.id,
    type: training.type,
    datetime: training.datetime,
    maxParticipants: training.maxParticipants ?? null,
    participants: active.get(training.id) ?? 0,
    cancellations: cancelled.get(training.id) ?? 0,
  }))

  return { trainings, registrations }
}

// Mená v poradí prihlásenia, zvlášť tí, čo zostali, a zvlášť odhlásení.
export function participantNames(registrations: RegistrationStat[], trainingId: number) {
  const active: string[] = []
  const cancelled: string[] = []

  for (const registration of registrations) {
    if (registration.trainingId !== trainingId) continue
    ;(registration.cancelled ? cancelled : active).push(registration.userName)
  }

  return { active, cancelled }
}

export function countUniqueParticipants(registrations: RegistrationStat[], trainingIds: Set<number>) {
  const users = new Set<string>()

  for (const registration of registrations) {
    if (!registration.cancelled && trainingIds.has(registration.trainingId)) {
      users.add(registration.userId)
    }
  }

  return users.size
}

export function monthKey(datetime: string) {
  return datetime.slice(0, 7)
}

export function listMonths(trainings: TrainingStat[]) {
  return [...new Set(trainings.map((training) => monthKey(training.datetime)))].sort((a, b) => b.localeCompare(a))
}

export function summarize(trainings: TrainingStat[]): Summary {
  const participants = trainings.reduce((sum, training) => sum + training.participants, 0)
  const cancellations = trainings.reduce((sum, training) => sum + training.cancellations, 0)
  const signups = participants + cancellations

  return {
    trainings: trainings.length,
    participants,
    cancellations,
    cancellationRate: signups ? Math.round((cancellations / signups) * 100) : 0,
  }
}

export function summarizeByType(trainings: TrainingStat[]): TypeStat[] {
  const types = new Map<string, TypeStat>()

  for (const training of trainings) {
    const type = types.get(training.type) ?? { type: training.type, trainings: 0, participants: 0, cancellations: 0 }
    type.trainings += 1
    type.participants += training.participants
    type.cancellations += training.cancellations
    types.set(training.type, type)
  }

  return [...types.values()].sort((a, b) => b.trainings - a.trainings)
}

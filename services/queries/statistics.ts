import { supabaseAdmin } from '@/lib/supabase'
import type { RegistrationStat, StatisticsData, Summary, TrainingStat, TypeStat } from '@/lib/types'

export async function getStatisticsData(): Promise<StatisticsData> {
  const [trainingsResult, registrationsResult] = await Promise.all([
    supabaseAdmin
      .from('trainings')
      .select('id, type, datetime, maxParticipants')
      .order('datetime', { ascending: false }),
    supabaseAdmin.from('training_registrations').select('training_id, user_id, cancelled_at'),
  ])

  if (trainingsResult.error || registrationsResult.error) {
    console.error(trainingsResult.error ?? registrationsResult.error)
    return { trainings: [], registrations: [] }
  }

  const registrations: RegistrationStat[] = registrationsResult.data.map((registration) => ({
    trainingId: registration.training_id,
    userId: registration.user_id,
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

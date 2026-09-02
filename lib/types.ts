import type { AuthDenialReason } from '@/lib/auth/auth-result'
import type { Role } from '@/lib/auth/roles'

export interface SessionUser {
  id: string
  email: string | null
  role: Role
  name: string
  phone: string
}

export type Session =
  | { status: 'unauthenticated' }
  | { status: 'denied'; reason: AuthDenialReason }
  | { status: 'authenticated'; user: SessionUser }

export type RequestAuthorization = { ok: true; user: SessionUser } | { ok: false; response: Response }

export type AuthUserMetadata = { first_name?: unknown; last_name?: unknown } | undefined

export interface UserProfileRow {
  id: string
  email: string | null
  fullName: string | null
  phoneNumber: string | null
  role: unknown
}

export type ActionResult = { ok: true } | { ok: false; message: string }

export const REGISTRATION_CODES = [
  'ok',
  'unauthenticated',
  'not_found',
  'past',
  'already_registered',
  'full',
  'deadline_passed',
  'not_registered',
] as const

export type RegistrationCode = (typeof REGISTRATION_CODES)[number]

export interface ParticipantContact {
  name: string
  email: string | null
}

export interface UserJoin {
  fullName: string
  phoneNumber: string | null
  email: string | null
}

export interface TrainingStat {
  id: number
  type: string
  datetime: string
  maxParticipants: number | null
  participants: number
  cancellations: number
}

export interface RegistrationStat {
  trainingId: number
  userId: string
  userName: string
  cancelled: boolean
}

export interface TypeStat {
  type: string
  trainings: number
  participants: number
  cancellations: number
}

export interface Summary {
  trainings: number
  participants: number
  cancellations: number
  cancellationRate: number
}

export interface StatisticsData {
  trainings: TrainingStat[]
  registrations: RegistrationStat[]
}

export interface ActiveParticipant {
  userId: string
  name: string
  phone: string
  email: string
  registeredAt: string
}

export interface CancelledParticipant {
  userId: string
  name: string
  phone: string
  email: string
  cancelledAt: string
}

export interface TrainingParticipants {
  active: ActiveParticipant[]
  cancelled: CancelledParticipant[]
}

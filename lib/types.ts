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
  'not_full',
  'already_waitlisted',
  'waitlist_full',
  'not_waitlisted',
] as const

export type RegistrationCode = (typeof REGISTRATION_CODES)[number]

export interface ParticipantContact {
  name: string
  email: string | null
}

export interface Training {
  id: number
  type: string
  datetime: string
  note: string
  unregisterDeadline?: string | null
  maxParticipants?: number | null
}

export interface CalendarProps {
  trainings: Training[]
  onDateSelect?: (date: string) => void
}

export interface TrainingListProps {
  trainings: Training[]
  role?: Role
  showAll?: boolean
  userRegistrations?: number[]
  userWaitlist?: number[]
  allowUnregister?: boolean
  occupancy?: Record<number, TrainingOccupancy>
  onlyRegistered?: boolean
}

export type TrainingListChange =
  | { kind: 'registration'; trainingId: number; joined: boolean }
  | { kind: 'waitlist'; trainingId: number; joined: boolean }

export interface TrainingListState {
  registrations: number[]
  waitlist: number[]
  occupancy: Record<number, TrainingOccupancy>
}

export interface TrainingListConfirmation {
  training: Training
  kind: 'unregister' | 'leaveWaitlist'
}

export interface TrainingEditTabsProps {
  training: {
    id?: number
    type: string
    datetime: string
    note?: string
    minParticipants?: number
    maxParticipants?: number
    unregisterDeadline?: string | null
  }
  action: (formData: FormData) => void
  participants: TrainingParticipants
  waitlistMax?: number
  onRemoveParticipant?: (trainingId: number, userId: string) => Promise<void>
}

export interface TrainingOccupancy {
  active: number
  max: number | null
  waitlist: number
  waitlistMax: number
}

export interface WaitlistRecipient {
  name: string
  email: string
}

export interface UserJoin {
  fullName: string
  phoneNumber: string | null
  email: string | null
}

export interface RegisteredUser {
  id: string
  name: string
  email: string | null
  phone: string | null
  registeredAt: string
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

export interface WaitlistedParticipant {
  userId: string
  name: string
  phone: string
  email: string
  joinedAt: string
  notifiedAt: string | null
}

export interface TrainingParticipants {
  active: ActiveParticipant[]
  cancelled: CancelledParticipant[]
  waitlist: WaitlistedParticipant[]
}

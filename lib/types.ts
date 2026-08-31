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

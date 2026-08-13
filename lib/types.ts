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

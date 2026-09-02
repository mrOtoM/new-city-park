'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Pencil, Users } from 'lucide-react'

import { type Role, hasAdminCapabilities } from '@/lib/auth/roles'
import { TRAINING_TYPES } from '@/lib/constants'
import { formatDate, isDeadlinePassed } from '@/lib/utils'
import { useTraining } from '@/components/providers/TrainingContext'
import { registerForTrainingAction, unregisterFromTrainingAction } from '@/services/actions/registrations'
import Button from '@/components/ui/Button'
import ConfirmSheet from '@/components/ui/ConfirmSheet'

interface Training {
  id: number
  type: string
  datetime: string
  note: string
  unregisterDeadline?: string | null
  maxParticipants?: number | null
}

interface TrainingListProps {
  trainings: Training[]
  role?: Role
  showAll?: boolean
  userRegistrations?: number[]
  allowUnregister?: boolean
  registrationCounts?: Record<number, number>
  onlyRegistered?: boolean
}

interface RegistrationChange {
  trainingId: number
  registered: boolean
}

interface RegistrationState {
  registrations: number[]
  counts: Record<number, number>
}

function applyRegistrationChange(state: RegistrationState, change: RegistrationChange): RegistrationState {
  const delta = change.registered ? 1 : -1

  return {
    registrations: change.registered
      ? [...state.registrations, change.trainingId]
      : state.registrations.filter((id) => id !== change.trainingId),
    counts: {
      ...state.counts,
      [change.trainingId]: Math.max(0, (state.counts[change.trainingId] || 0) + delta),
    },
  }
}

export default function TrainingList({
  trainings,
  role = 'user',
  showAll = false,
  userRegistrations = [],
  allowUnregister = true,
  registrationCounts = {},
  onlyRegistered = false,
}: TrainingListProps) {
  const isAdmin = hasAdminCapabilities(role)
  const { selectedDate } = useTraining()
  const [optimistic, applyChange] = useOptimistic(
    { registrations: userRegistrations, counts: registrationCounts },
    applyRegistrationChange,
  )
  const [, startTransition] = useTransition()
  const [confirmTraining, setConfirmTraining] = useState<Training | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const getTrainingType = (type: string) => {
    return TRAINING_TYPES.find((t) => t.value === type)
  }

  const visibleTrainings = (
    showAll
      ? trainings
      : selectedDate
        ? trainings.filter((training) => training.datetime.slice(0, 10) === selectedDate)
        : []
  ).sort((a, b) => a.datetime.localeCompare(b.datetime))

  const filteredTrainings = onlyRegistered
    ? visibleTrainings.filter((training) => optimistic.registrations.includes(training.id))
    : visibleTrainings

  // The optimistic change lives only inside the transition, so a failed result
  // rolls it back on its own; the message is what the user needs.
  const handleRegister = (trainingId: number) => {
    setErrorMsg(null)
    startTransition(async () => {
      applyChange({ trainingId, registered: true })
      const result = await registerForTrainingAction(trainingId)

      if (!result.ok) setErrorMsg(result.message)
    })
  }

  const handleUnregister = () => {
    if (!confirmTraining) return
    const trainingId = confirmTraining.id
    setErrorMsg(null)
    setConfirmTraining(null)
    startTransition(async () => {
      applyChange({ trainingId, registered: false })
      const result = await unregisterFromTrainingAction(trainingId)

      if (!result.ok) setErrorMsg(result.message)
    })
  }

  return (
    <div className="p-4">
      {errorMsg && (
        <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">{errorMsg}</div>
      )}
      {!showAll && selectedDate && (
        <div className="mb-4">
          <h2 className="text-primary-50 text-2xl">Tréningy - {formatDate(selectedDate)}</h2>
        </div>
      )}
      {filteredTrainings.length === 0 ? (
        <div className="text-primary-400 py-8 text-center">
          <p>Žiadne tréningy</p>
        </div>
      ) : (
        <ul className="text-primary-50 flex h-full flex-col items-center justify-between space-y-3">
          {filteredTrainings.map((training) => {
            const isRegistered = optimistic.registrations.includes(training.id)
            const registeredCount = optimistic.counts[training.id] || 0
            const deadlinePassed = isDeadlinePassed(training.unregisterDeadline)
            const isFull = !!(training.maxParticipants && registeredCount >= training.maxParticipants)
            const remaining = training.maxParticipants ? training.maxParticipants - registeredCount : null
            return (
              <li key={training.id} className="bg-primary-900/50 w-full space-y-2 rounded-lg p-3">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-x-3">
                    <div className="bg-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                      {(() => {
                        const t = getTrainingType(training.type)
                        const Icon = t?.icon || TRAINING_TYPES[0].icon
                        return <Icon className="h-4 w-4" />
                      })()}
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p className="pt-1">{getTrainingType(training.type)?.label || 'Tréning'}</p>
                      <p className="text-primary-400 text-sm">
                        {formatDate(training.datetime)} &middot; {formatDate(training.datetime, 'HH:mm')}
                      </p>
                      {isAdmin && showAll && (
                        <p className="text-primary-500 flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3" />
                          {registeredCount}
                          {training.maxParticipants ? ` / ${training.maxParticipants}` : ''}
                        </p>
                      )}
                      {!isAdmin && !showAll && remaining !== null && remaining > 0 && remaining <= 3 && (
                        <p className="flex items-center gap-1 text-xs text-orange-400">
                          <Users className="h-3 w-3" />
                          Posledné voľné miesta!
                        </p>
                      )}
                    </div>
                  </div>
                  {isAdmin ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Pencil className="h-4 w-4" />}
                      className="rounded-2xl"
                      href={`/trainings/${training.id}/edit`}
                    >
                      Upraviť
                    </Button>
                  ) : isRegistered && !allowUnregister ? (
                    <Button variant="ghost" size="sm" className="rounded-2xl" disabled>
                      Prihlásený
                    </Button>
                  ) : isRegistered && deadlinePassed ? (
                    <Button variant="ghost" size="sm" className="rounded-2xl" disabled>
                      Odhlásenie uzavreté
                    </Button>
                  ) : !isRegistered && isFull ? (
                    <Button variant="ghost" size="sm" className="rounded-2xl" disabled>
                      Plne obsadený !
                    </Button>
                  ) : (
                    <Button
                      variant={isRegistered ? 'ghost' : 'secondary'}
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => (isRegistered ? setConfirmTraining(training) : handleRegister(training.id))}
                    >
                      {isRegistered ? 'Odhlásiť sa' : 'Prihlásiť sa'}
                    </Button>
                  )}
                </div>
                {training.note && <p className="text-primary-300 pl-13 text-xs italic">{training.note}</p>}
                {showAll && training.unregisterDeadline && (
                  <p className={`pl-13 text-xs ${deadlinePassed ? 'text-red-400' : 'text-primary-500'}`}>
                    {deadlinePassed
                      ? `Odhlásenie uzavreté: ${formatDate(training.unregisterDeadline, 'd. MMMM, HH:mm')}`
                      : `Odhlásenie možné do: ${formatDate(training.unregisterDeadline, 'd. MMMM, HH:mm')}`}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmSheet
        open={!!confirmTraining}
        title="Odhlásiť sa z tréningu?"
        description={
          confirmTraining
            ? `${getTrainingType(confirmTraining.type)?.label || 'Tréning'} – ${formatDate(confirmTraining.datetime)}, ${formatDate(confirmTraining.datetime, 'HH:mm')}`
            : ''
        }
        confirmLabel="Odhlásiť sa"
        cancelLabel="Zrušiť"
        confirmVariant="primary"
        onConfirm={handleUnregister}
        onCancel={() => setConfirmTraining(null)}
      />
    </div>
  )
}

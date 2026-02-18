'use client'

import { Pencil, Users } from 'lucide-react'
import { TRAINING_TYPES } from '@/lib/constants'
import { formatDate, isDeadlinePassed } from '@/lib/utils'
import { useTraining } from './TrainingContext'
import { registerForTrainingAction, unregisterFromTrainingAction } from '@/lib/actions'
import Button from './Button'
import ConfirmSheet from './ConfirmSheet'
import { useState, useTransition } from 'react'

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
  role?: string
  showAll?: boolean
  userRegistrations?: number[]
  allowUnregister?: boolean
  registrationCounts?: Record<number, number>
}

export default function TrainingList({
  trainings,
  role = 'user',
  showAll = false,
  userRegistrations = [],
  allowUnregister = true,
  registrationCounts = {},
}: TrainingListProps) {
  const isAdmin = role === 'admin'
  const { selectedDate } = useTraining()
  const [registrations, setRegistrations] = useState<number[]>(userRegistrations)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()
  const [confirmTraining, setConfirmTraining] = useState<Training | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const getTrainingType = (type: string) => {
    return TRAINING_TYPES.find((t) => t.value === type)
  }

  const filteredTrainings = (
    showAll
      ? trainings
      : selectedDate
        ? trainings.filter((training) => training.datetime.slice(0, 10) === selectedDate)
        : []
  ).sort((a, b) => a.datetime.localeCompare(b.datetime))

  const handleRegister = (trainingId: number) => {
    setLoadingId(trainingId)
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await registerForTrainingAction(trainingId)
        setRegistrations((prev) => [...prev, trainingId])
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Nepodarilo sa prihlásiť')
      } finally {
        setLoadingId(null)
      }
    })
  }

  const handleUnregister = () => {
    if (!confirmTraining) return
    const trainingId = confirmTraining.id
    setLoadingId(trainingId)
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await unregisterFromTrainingAction(trainingId)
        setRegistrations((prev) => prev.filter((id) => id !== trainingId))
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Nepodarilo sa odhlásiť')
      } finally {
        setLoadingId(null)
        setConfirmTraining(null)
      }
    })
  }

  return (
    <div className="p-4">
      {errorMsg && (
        <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
          {errorMsg}
        </div>
      )}
      {!showAll && selectedDate && (
        <div className="mb-4">
          <h2 className="text-2xl text-white">Tréningy - {formatDate(selectedDate)}</h2>
        </div>
      )}
      {filteredTrainings.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <p>Žiadne tréningy v tento deň</p>
        </div>
      ) : (
        <ul className="flex h-full flex-col items-center justify-between space-y-3 text-white">
          {filteredTrainings.map((training) => {
            const isRegistered = registrations.includes(training.id)
            const deadlinePassed = isDeadlinePassed(training.unregisterDeadline)
            const isFull = !!(
              training.maxParticipants && (registrationCounts[training.id] || 0) >= training.maxParticipants
            )
            const remaining = training.maxParticipants
              ? training.maxParticipants - (registrationCounts[training.id] || 0)
              : null
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
                          {registrationCounts[training.id] || 0}
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
                      loading={loadingId === training.id}
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
        loading={loadingId === confirmTraining?.id}
        onConfirm={handleUnregister}
        onCancel={() => setConfirmTraining(null)}
      />
    </div>
  )
}

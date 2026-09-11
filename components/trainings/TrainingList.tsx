'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Pencil, Users } from 'lucide-react'

import { type Role, hasAdminCapabilities } from '@/lib/auth/roles'
import { TRAINING_TYPES } from '@/lib/constants'
import type { ActionResult, TrainingOccupancy } from '@/lib/types'
import { formatDate, isDeadlinePassed } from '@/lib/utils'
import { useTraining } from '@/components/providers/TrainingContext'
import {
  joinWaitlistAction,
  leaveWaitlistAction,
  registerForTrainingAction,
  unregisterFromTrainingAction,
} from '@/services/actions/registrations'
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
  userWaitlist?: number[]
  allowUnregister?: boolean
  occupancy?: Record<number, TrainingOccupancy>
  onlyRegistered?: boolean
}

type ListChange =
  | { kind: 'registration'; trainingId: number; joined: boolean }
  | { kind: 'waitlist'; trainingId: number; joined: boolean }

interface ListState {
  registrations: number[]
  waitlist: number[]
  occupancy: Record<number, TrainingOccupancy>
}

type Confirmation = { training: Training; kind: 'unregister' | 'leaveWaitlist' }

const EMPTY_OCCUPANCY: TrainingOccupancy = { active: 0, max: null, waitlist: 0, waitlistMax: 0 }

function toggle(ids: number[], id: number, present: boolean): number[] {
  return present ? [...ids, id] : ids.filter((other) => other !== id)
}

// Membership and the matching count move together, so they never disagree mid-flight.
function applyListChange(state: ListState, change: ListChange): ListState {
  const current = state.occupancy[change.trainingId] ?? EMPTY_OCCUPANCY
  const delta = change.joined ? 1 : -1

  if (change.kind === 'registration') {
    return {
      ...state,
      registrations: toggle(state.registrations, change.trainingId, change.joined),
      occupancy: {
        ...state.occupancy,
        [change.trainingId]: { ...current, active: Math.max(0, current.active + delta) },
      },
    }
  }

  return {
    ...state,
    waitlist: toggle(state.waitlist, change.trainingId, change.joined),
    occupancy: {
      ...state.occupancy,
      [change.trainingId]: { ...current, waitlist: Math.max(0, current.waitlist + delta) },
    },
  }
}

export default function TrainingList({
  trainings,
  role = 'user',
  showAll = false,
  userRegistrations = [],
  userWaitlist = [],
  allowUnregister = true,
  occupancy = {},
  onlyRegistered = false,
}: TrainingListProps) {
  const isAdmin = hasAdminCapabilities(role)
  const { selectedDate } = useTraining()
  const [optimistic, applyChange] = useOptimistic(
    { registrations: userRegistrations, waitlist: userWaitlist, occupancy },
    applyListChange,
  )
  const [, startTransition] = useTransition()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
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
    ? visibleTrainings.filter(
        (training) => optimistic.registrations.includes(training.id) || optimistic.waitlist.includes(training.id),
      )
    : visibleTrainings

  // The optimistic change lives only inside the transition, so a failed result
  // rolls it back on its own; the message is what the user needs.
  const run = (change: ListChange, action: (trainingId: number) => Promise<ActionResult>) => {
    setErrorMsg(null)
    startTransition(async () => {
      applyChange(change)
      const result = await action(change.trainingId)

      if (!result.ok) setErrorMsg(result.message)
    })
  }

  const handleRegister = (trainingId: number) =>
    run({ kind: 'registration', trainingId, joined: true }, registerForTrainingAction)

  const handleJoinWaitlist = (trainingId: number) =>
    run({ kind: 'waitlist', trainingId, joined: true }, joinWaitlistAction)

  const handleConfirm = () => {
    if (!confirmation) return
    const { training, kind } = confirmation
    setConfirmation(null)

    if (kind === 'unregister') {
      run({ kind: 'registration', trainingId: training.id, joined: false }, unregisterFromTrainingAction)
    } else {
      run({ kind: 'waitlist', trainingId: training.id, joined: false }, leaveWaitlistAction)
    }
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
            const isWaitlisted = optimistic.waitlist.includes(training.id)
            const current = optimistic.occupancy[training.id] ?? EMPTY_OCCUPANCY
            const registeredCount = current.active
            const deadlinePassed = isDeadlinePassed(training.unregisterDeadline)
            const isFull = !!(training.maxParticipants && registeredCount >= training.maxParticipants)
            const remaining = training.maxParticipants ? training.maxParticipants - registeredCount : null
            const waitlistFull = current.waitlist >= current.waitlistMax
            const showWaitlist = !isAdmin && !isRegistered && isFull
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
                  ) : showWaitlist ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="rounded-2xl" disabled>
                        Plne obsadený !
                      </Button>
                      {isWaitlisted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => setConfirmation({ training, kind: 'leaveWaitlist' })}
                        >
                          Náhradník
                        </Button>
                      ) : waitlistFull ? (
                        <Button variant="ghost" size="sm" className="rounded-2xl" disabled>
                          Náhradníci obsadení
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => handleJoinWaitlist(training.id)}
                        >
                          Prihlásiť sa ako náhradník
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant={isRegistered ? 'ghost' : 'secondary'}
                      size="sm"
                      className="rounded-2xl"
                      onClick={() =>
                        isRegistered ? setConfirmation({ training, kind: 'unregister' }) : handleRegister(training.id)
                      }
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
        open={!!confirmation}
        title={confirmation?.kind === 'leaveWaitlist' ? 'Zrušiť náhradníka?' : 'Odhlásiť sa z tréningu?'}
        description={
          confirmation
            ? `${getTrainingType(confirmation.training.type)?.label || 'Tréning'} – ${formatDate(confirmation.training.datetime)}, ${formatDate(confirmation.training.datetime, 'HH:mm')}${confirmation.kind === 'leaveWaitlist' ? '. Prestaneš dostávať upozornenie na uvoľnené miesto.' : ''}`
            : ''
        }
        confirmLabel={confirmation?.kind === 'leaveWaitlist' ? 'Zrušiť náhradníka' : 'Odhlásiť sa'}
        cancelLabel={confirmation?.kind === 'leaveWaitlist' ? 'Späť' : 'Zrušiť'}
        confirmVariant="primary"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmation(null)}
      />
    </div>
  )
}

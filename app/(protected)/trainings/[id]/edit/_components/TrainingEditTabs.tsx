'use client'

import { useState, useTransition } from 'react'
import { Phone, UserMinus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ActiveParticipant, TrainingParticipants } from '@/lib/types'
import TrainingForm from '@/app/(protected)/trainings/_components/TrainingForm'
import ConfirmSheet from '@/components/ui/ConfirmSheet'

interface TrainingEditTabsProps {
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
  onRemoveParticipant?: (trainingId: number, userId: string) => Promise<void>
}

export default function TrainingEditTabs({
  training,
  action,
  participants,
  onRemoveParticipant,
}: TrainingEditTabsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'participants'>('info')
  const [confirmParticipant, setConfirmParticipant] = useState<ActiveParticipant | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [isRemoving, startRemoving] = useTransition()

  const canRemove = !!onRemoveParticipant && !!training.id

  function handleRemove() {
    if (!onRemoveParticipant || !training.id || !confirmParticipant) return

    const trainingId = training.id
    const { userId } = confirmParticipant

    startRemoving(async () => {
      try {
        await onRemoveParticipant(trainingId, userId)
        setConfirmParticipant(null)
        setRemoveError(null)
      } catch {
        setRemoveError('Účastníka sa nepodarilo odhlásiť. Skús to znova.')
      }
    })
  }

  return (
    <div>
      <div className="border-primary-700 flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'info'
              ? 'border-accent-500 text-primary-50 border-b-2'
              : 'text-primary-400 hover:text-primary-200'
          }`}
        >
          Informácie
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('participants')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'participants'
              ? 'border-accent-500 text-primary-50 border-b-2'
              : 'text-primary-400 hover:text-primary-200'
          }`}
        >
          Prihlásení ({participants.active.length})
        </button>
      </div>

      {activeTab === 'info' ? (
        <TrainingForm training={training} action={action} />
      ) : (
        <div className="mx-auto max-w-6xl space-y-6 p-4">
          {removeError && <p className="text-sm text-red-400">{removeError}</p>}

          {participants.active.length === 0 && participants.cancelled.length === 0 ? (
            <p className="text-primary-400 py-8 text-center">Zatiaľ nikto prihlásený</p>
          ) : (
            <>
              {participants.active.length > 0 && (
                <ul className="space-y-2">
                  {participants.active.map((p, i) => (
                    <li key={p.userId} className="bg-primary-900/50 flex items-center justify-between rounded-lg p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-primary-50 font-medium">{p.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-primary-400 flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" />
                            {p.phone}
                          </span>
                          <span className="text-primary-400 text-xs">{p.email}</span>
                          <span className="text-primary-500 text-xs">
                            {formatDate(p.registeredAt, 'd. MMMM, HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex items-center gap-3">
                        <span className="text-primary-500 text-xs">#{i + 1}</span>
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveError(null)
                              setConfirmParticipant(p)
                            }}
                            disabled={isRemoving}
                            aria-label={`Odhlásiť účastníka ${p.name}`}
                            className="border-primary-700 bg-primary-800 text-primary-300 hover:bg-primary-700 cursor-pointer rounded-lg border p-2 shadow-sm transition-colors hover:border-red-400/40 hover:text-red-400 disabled:pointer-events-none disabled:opacity-50"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {participants.cancelled.length > 0 && (
                <div>
                  <h3 className="text-primary-400 mb-2 text-sm font-medium">
                    Odhlásení ({participants.cancelled.length})
                  </h3>
                  <ul className="space-y-2">
                    {participants.cancelled.map((p) => (
                      <li
                        key={p.userId}
                        className="bg-primary-900/30 flex items-center justify-between rounded-lg p-3 opacity-60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-primary-50 font-medium line-through">{p.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-primary-400 flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3" />
                              {p.phone}
                            </span>
                            <span className="text-primary-400 text-xs">{p.email}</span>
                            <span className="text-xs text-red-400">
                              odhlásený {formatDate(p.cancelledAt, 'd. MMMM, HH:mm')}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmSheet
        open={!!confirmParticipant}
        title="Odhlásiť účastníka?"
        description={
          confirmParticipant
            ? `${confirmParticipant.name} bude odhlásený z tréningu a presunie sa do zoznamu odhlásených.`
            : ''
        }
        confirmLabel="Odhlásiť"
        cancelLabel="Zrušiť"
        confirmVariant="primary"
        loading={isRemoving}
        onConfirm={handleRemove}
        onCancel={() => setConfirmParticipant(null)}
      />
    </div>
  )
}

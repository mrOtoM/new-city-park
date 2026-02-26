'use client'

import { useState } from 'react'
import { Phone } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import TrainingForm from '@/components/TrainingForm'

interface ActiveParticipant {
  name: string
  phone: string
  email: string
  registeredAt: string
}

interface CancelledParticipant {
  name: string
  phone: string
  email: string
  cancelledAt: string
}

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
  participants: {
    active: ActiveParticipant[]
    cancelled: CancelledParticipant[]
  }
}

export default function TrainingEditTabs({ training, action, participants }: TrainingEditTabsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'participants'>('info')

  return (
    <div>
      <div className="border-primary-700 flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'info' ? 'border-accent-500 border-b-2 text-primary-50' : 'text-primary-400 hover:text-primary-200'
          }`}
        >
          Informácie
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('participants')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'participants'
              ? 'border-accent-500 border-b-2 text-primary-50'
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
          {participants.active.length === 0 && participants.cancelled.length === 0 ? (
            <p className="text-primary-400 py-8 text-center">Zatiaľ nikto prihlásený</p>
          ) : (
            <>
              {participants.active.length > 0 && (
                <ul className="space-y-2">
                  {participants.active.map((p, i) => (
                    <li key={i} className="bg-primary-900/50 flex items-center justify-between rounded-lg p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-primary-50">{p.name}</p>
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
                      <span className="text-primary-500 ml-3 text-xs">#{i + 1}</span>
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
                    {participants.cancelled.map((p, i) => (
                      <li
                        key={i}
                        className="bg-primary-900/30 flex items-center justify-between rounded-lg p-3 opacity-60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-primary-50 line-through">{p.name}</p>
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
    </div>
  )
}

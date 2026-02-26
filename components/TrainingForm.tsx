'use client'

import { useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'

import Button from '@/components/Button'
import ConfirmSheet from '@/components/ConfirmSheet'
import { TRAINING_TYPES, UNREGISTER_DEADLINE_OPTIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { deleteTrainingAction } from '@/services/actions/trainings'

interface TrainingData {
  id?: number
  type: string
  datetime: string
  note?: string
  minParticipants?: number
  maxParticipants?: number
  unregisterDeadline?: string | null
}

interface TrainingFormProps {
  training?: TrainingData
  action: (formData: FormData) => void
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" className="flex-1" loading={pending}>
      {isEdit ? 'Uložiť tréning' : 'Vytvoriť tréning'}
    </Button>
  )
}

const inputClass =
  'bg-primary-800 border-primary-700 text-primary-50 placeholder:text-primary-600 focus:border-primary-500 focus:ring-primary-500 w-full rounded-lg border px-4 py-3 focus:ring-1 focus:outline-none'

function getDeadlineHoursFromTraining(training?: TrainingData): string {
  if (!training?.datetime || !training?.unregisterDeadline) return ''

  const trainingDate = new Date(training.datetime)
  const deadlineDate = new Date(training.unregisterDeadline)

  if (isNaN(trainingDate.getTime()) || isNaN(deadlineDate.getTime())) return ''

  const diffHours = Math.round((trainingDate.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60))
  const match = UNREGISTER_DEADLINE_OPTIONS.find((opt) => opt.value !== '' && Number(opt.value) === diffHours)

  return match?.value ?? ''
}

export default function TrainingForm({ training, action }: TrainingFormProps) {
  const isEdit = !!training?.id
  const [selectedType, setSelectedType] = useState(training?.type || TRAINING_TYPES[0].value)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [deleteError, setDeleteError] = useState('')
  const [deadlineHours, setDeadlineHours] = useState(getDeadlineHoursFromTraining(training))

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="text-primary-50 mb-6 text-2xl font-semibold">{isEdit ? 'Upraviť tréning' : 'Nový tréning'}</h1>

      <form action={action} className="space-y-6">
        {training?.id && <input type="hidden" name="id" value={training.id} />}
        <input type="hidden" name="type" value={selectedType} />

        <div>
          <label className="text-primary-300 mb-2 block text-sm font-medium">Typ tréningu</label>
          <div className="grid grid-cols-2 gap-3">
            {TRAINING_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = selectedType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-primary-400 bg-primary-700 text-primary-50'
                      : 'border-primary-700 bg-primary-800 text-primary-300 hover:border-primary-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="text-primary-300 mb-2 block text-sm font-medium">
              Dátum
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={training?.datetime ? formatDate(training.datetime, 'yyyy-MM-dd') : ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="time" className="text-primary-300 mb-2 block text-sm font-medium">
              Čas
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required
              defaultValue={training?.datetime ? formatDate(training.datetime, 'HH:mm') : ''}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="text-primary-300 mb-2 block text-sm font-medium">Odhlásenie možné do</label>
          <input type="hidden" name="unregisterDeadlineHours" value={deadlineHours} />
          <div className="grid grid-cols-3 gap-3">
            {UNREGISTER_DEADLINE_OPTIONS.map((option) => {
              const isSelected = deadlineHours === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDeadlineHours(option.value)}
                  className={`rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-primary-400 bg-primary-700 text-primary-50'
                      : 'border-primary-700 bg-primary-800 text-primary-300 hover:border-primary-500'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label htmlFor="note" className="text-primary-300 mb-2 block text-sm font-medium">
            Poznámka
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            placeholder="Voliteľná poznámka k tréningu..."
            defaultValue={training?.note || ''}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="minParticipants" className="text-primary-300 mb-2 block text-sm font-medium">
              Min. účastníkov
            </label>
            <input
              id="minParticipants"
              name="minParticipants"
              type="number"
              min="0"
              placeholder="0"
              defaultValue={training?.minParticipants || ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="maxParticipants" className="text-primary-300 mb-2 block text-sm font-medium">
              Max. účastníkov
            </label>
            <input
              id="maxParticipants"
              name="maxParticipants"
              type="number"
              min="0"
              placeholder="0"
              defaultValue={training?.maxParticipants || ''}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" href="/trainings" className="flex-1">
            Zrušiť
          </Button>
          <SubmitButton isEdit={isEdit} />
        </div>
      </form>

      {isEdit && (
        <>
          {deleteError && <p className="mt-4 text-center text-sm text-red-400">{deleteError}</p>}
          <div className="border-primary-700 mt-8 border-t pt-6">
            <Button
              variant="ghost"
              fullWidth
              icon={<Trash2 className="h-4 w-4" />}
              className="text-red-400 hover:text-red-300"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Zrušiť tréning
            </Button>
          </div>

          <ConfirmSheet
            open={showDeleteConfirm}
            title="Zrušiť tréning?"
            description="Tréning bude natrvalo zrušený a všetkým prihláseným účastníkom bude odoslaný email o zrušení."
            confirmLabel="Zrušiť tréning"
            cancelLabel="Zrušiť"
            confirmVariant="primary"
            loading={isDeleting}
            onConfirm={() => {
              setDeleteError('')
              startDeleteTransition(async () => {
                try {
                  if (training?.id) await deleteTrainingAction(training.id)
                } catch {
                  setDeleteError('Nepodarilo sa zrušiť tréning')
                  setShowDeleteConfirm(false)
                }
              })
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </>
      )}
    </div>
  )
}

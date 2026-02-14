'use client'

import { Dumbbell, Footprints, Heart, RotateCcw } from 'lucide-react'
import Button from '@/components/Button'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'

const trainingTypes = [
  { value: 'STRENGTH', label: 'Silový tréning', icon: Dumbbell },
  { value: 'STEP', label: 'Step tréning', icon: Footprints },
  { value: 'CARDIO', label: 'Kardio tréning', icon: Heart },
  { value: 'CIRCLE', label: 'Kruhový tréning', icon: RotateCcw },
]

interface TrainingData {
  id?: number
  type: string
  date: string
  time: string
  note?: string
  minParticipants?: number
  maxParticipants?: number
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
  'bg-primary-800 border-primary-700 text-white placeholder:text-primary-600 focus:border-primary-500 focus:ring-primary-500 w-full rounded-lg border px-4 py-3 focus:ring-1 focus:outline-none'

export default function TrainingForm({ training, action }: TrainingFormProps) {
  const isEdit = !!training?.id
  const [selectedType, setSelectedType] = useState(training?.type || '')

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="mb-6 text-2xl font-semibold text-white">
        {isEdit ? 'Upraviť tréning' : 'Nový tréning'}
      </h1>

      <form action={action} className="space-y-6">
        {training?.id && <input type="hidden" name="id" value={training.id} />}
        <input type="hidden" name="type" value={selectedType} />

        {/* Typ tréningu */}
        <div>
          <label className="text-primary-300 mb-2 block text-sm font-medium">
            Typ tréningu
          </label>
          <div className="grid grid-cols-2 gap-3">
            {trainingTypes.map((type) => {
              const Icon = type.icon
              const isSelected = selectedType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-primary-400 bg-primary-700 text-white'
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

        {/* Dátum */}
        <div>
          <label htmlFor="date" className="text-primary-300 mb-2 block text-sm font-medium">
            Dátum
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={training?.date || ''}
            className={inputClass}
          />
        </div>

        {/* Čas */}
        <div>
          <label htmlFor="time" className="text-primary-300 mb-2 block text-sm font-medium">
            Čas
          </label>
          <input
            id="time"
            name="time"
            type="time"
            required
            defaultValue={training?.time?.substring(0, 5) || ''}
            className={inputClass}
          />
        </div>

        {/* Poznámka */}
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

        {/* Min/Max účastníci */}
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

        {/* Tlačidlá */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" href="/trainings" className="flex-1">
            Zrušiť
          </Button>
          <SubmitButton isEdit={isEdit} />
        </div>
      </form>
    </div>
  )
}

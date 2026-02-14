'use client'

import { Dumbbell, Footprints, Heart, RotateCcw, Pencil } from 'lucide-react'
import { useTraining } from './TrainingContext'
import Button from './Button'

interface Training {
  id: number
  type: string
  date: string
  time: string
  note: string
}

interface TrainingListProps {
  trainings: Training[]
  role?: string
  showAll?: boolean
}

export default function TrainingList({ trainings, role = 'user', showAll = false }: TrainingListProps) {
  const isAdmin = role === 'admin'
  const { selectedDate, setSelectedDate } = useTraining()

  const getTrainingIcon = (type: string) => {
    switch (type) {
      case 'STRENGTH':
        return <Dumbbell className="h-4 w-4" />
      case 'STEP':
        return <Footprints className="h-4 w-4" />
      case 'CARDIO':
        return <Heart className="h-4 w-4" />
      case 'CIRCLE':
        return <RotateCcw className="h-4 w-4" />
      default:
        return <Dumbbell className="h-4 w-4" />
    }
  }

  const getTrainingName = (type: string) => {
    switch (type) {
      case 'STRENGTH':
        return 'Silový tréning'
      case 'STEP':
        return 'Step tréning'
      case 'CARDIO':
        return 'Kardio tréning'
      case 'CIRCLE':
        return 'Kruhový tréning'
      default:
        return 'Tréning'
    }
  }

  // Funkcia na formátovanie času z HH:MM:SS na HH:MM
  const formatTime = (time: string) => {
    return time.substring(0, 5) // zoberie len HH:MM časť
  }

  // Filtrujeme tréningy podľa vybraného dátumu (len ak nie je showAll)
  const filteredTrainings = showAll
    ? trainings
    : selectedDate
      ? trainings.filter((training) => training.date === selectedDate)
      : trainings

  // Funkcia na formátovanie dátumu pre zobrazenie
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4">
      {!showAll && selectedDate && (
        <div className="mb-4">
          <h2 className="text-2xl text-white">
            Tréningy - {formatDate(selectedDate)}
          </h2>
        </div>
      )}
      {filteredTrainings.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <p>Žiadne tréningy v tento deň</p>
        </div>
      ) : (
        <ul className="flex h-full flex-col items-center justify-between space-y-3 text-white">
          {filteredTrainings.map((training) => (
            <li
              key={training.id}
              className="flex w-full items-center justify-between"
            >
              <div className="flex w-full items-center gap-x-3">
                <div className="bg-primary-600 flex h-10 w-10 items-center justify-center rounded-md">
                  {getTrainingIcon(training.type)}
                </div>
                <div className="flex flex-col space-y-1">
                  <p className="pt-1">{getTrainingName(training.type)}</p>
                  <p className="text-primary-400 text-sm">
                    {formatDate(training.date)} &middot; {formatTime(training.time)}
                  </p>
                </div>
              </div>
              {isAdmin ? (
                <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} className="rounded-2xl" href={`/trainings/${training.id}/edit`}>
                  Upraviť
                </Button>
              ) : (
                <Button variant="secondary" size="sm" className="rounded-2xl">
                  Prihlásiť sa
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

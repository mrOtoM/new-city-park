import TrainingList from '@/components/TrainingList'
import Button from '@/components/Button'
import { getTrainings } from '@/services/trainings'
import { auth } from '@/lib/auth'
import { Plus } from 'lucide-react'

export const revalidate = 0

export const metadata = {
  title: 'Tréningy',
}

export default async function TrainingsPage() {
  const [trainings, session] = await Promise.all([getTrainings(), auth()])
  const role = session?.user?.role ?? 'user'
  const isAdmin = role === 'admin'

  const today = new Date().toISOString().split('T')[0]
  const currentTrainings = trainings
    .filter((t) => t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  return (
    <div className="mx-auto max-w-6xl">
      {isAdmin && (
        <div className="p-4 pb-0">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            href="/trainings/new"
            icon={<Plus className="h-5 w-5" />}
          >
            Pridať tréning
          </Button>
        </div>
      )}
      <TrainingList trainings={currentTrainings} role={role} showAll />
    </div>
  )
}

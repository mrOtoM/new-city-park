import TrainingList from '@/components/TrainingList'
import Button from '@/components/Button'
import { getTrainings } from '@/services/queries/trainings'
import { getUserRegistrations, getRegistrationCounts } from '@/services/queries/registrations'
import { auth } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export const revalidate = 0

export const metadata = {
  title: 'Tréningy',
}

export default async function TrainingsPage() {
  const [trainings, session] = await Promise.all([getTrainings(), auth()])
  const role = session?.user?.role ?? 'user'
  const isAdmin = role === 'admin'

  const today = formatDate(new Date(), 'yyyy-MM-dd')
  const currentTrainings = trainings
    .filter((t) => t.datetime.slice(0, 10) >= today)
    .sort((a, b) => a.datetime.localeCompare(b.datetime))

  const [userRegistrations, registrationCounts] = await Promise.all([
    session?.user?.id ? getUserRegistrations(session.user.id) : Promise.resolve([]),
    getRegistrationCounts(),
  ])

  const visibleTrainings = isAdmin
    ? currentTrainings
    : currentTrainings.filter((t) => userRegistrations.includes(t.id))

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
      <TrainingList
        trainings={visibleTrainings}
        role={role}
        showAll
        userRegistrations={userRegistrations}
        registrationCounts={registrationCounts}
      />
    </div>
  )
}

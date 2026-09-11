import TrainingList from '@/components/trainings/TrainingList'
import Button from '@/components/ui/Button'
import { getTrainings } from '@/services/queries/trainings'
import { getTrainingOccupancy, getUserRegistrations, getUserWaitlist } from '@/services/queries/registrations'
import { requireUser } from '@/lib/auth/dal'
import { hasAdminCapabilities } from '@/lib/auth/roles'
import { Plus } from 'lucide-react'

export const revalidate = 0

export const metadata = {
  title: 'Tréningy',
}

export default async function TrainingsPage() {
  const [trainings, user] = await Promise.all([getTrainings(), requireUser()])
  const isAdmin = hasAdminCapabilities(user.role)

  const now = new Date()
  const currentTrainings = trainings
    .filter((t) => new Date(t.datetime) >= now)
    .sort((a, b) => a.datetime.localeCompare(b.datetime))

  const [userRegistrations, userWaitlist, occupancy] = await Promise.all([
    getUserRegistrations(user.id),
    getUserWaitlist(user.id),
    getTrainingOccupancy(),
  ])

  // The server filters for a correct first render; the client mirrors the same
  // rule optimistically through `onlyRegistered`. Waitlisted trainings count as
  // "mine" so the person can leave the waitlist from here.
  const visibleTrainings = isAdmin
    ? currentTrainings
    : currentTrainings.filter((t) => userRegistrations.includes(t.id) || userWaitlist.includes(t.id))

  return (
    <div className="mx-auto max-w-6xl">
      {isAdmin && (
        <div className="p-4 pb-0">
          <Button variant="primary" size="lg" fullWidth href="/trainings/new" icon={<Plus className="h-5 w-5" />}>
            Pridať tréning
          </Button>
        </div>
      )}
      <TrainingList
        trainings={visibleTrainings}
        role={user.role}
        showAll
        onlyRegistered={!isAdmin}
        userRegistrations={userRegistrations}
        occupancy={occupancy}
        userWaitlist={userWaitlist}
      />
    </div>
  )
}

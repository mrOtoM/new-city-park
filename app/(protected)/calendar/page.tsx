import Calendar from '@/app/(protected)/calendar/_components/Calendar'
import TrainingList from '@/components/trainings/TrainingList'
import { getTrainings } from '@/services/queries/trainings'
import { getUserRegistrations, getRegistrationCounts } from '@/services/queries/registrations'
import { requireUser } from '@/lib/auth/dal'

export const revalidate = 0

export const metadata = {
  title: 'Kalendár',
}

export default async function CalendarPage() {
  const [trainings, user] = await Promise.all([getTrainings(), requireUser()])
  const [userRegistrations, registrationCounts] = await Promise.all([
    getUserRegistrations(user.id),
    getRegistrationCounts(),
  ])

  return (
    <div className="mx-auto max-w-6xl">
      <Calendar trainings={trainings} />
      <TrainingList
        trainings={trainings}
        role={user.role}
        userRegistrations={userRegistrations}
        allowUnregister={false}
        registrationCounts={registrationCounts}
      />
    </div>
  )
}

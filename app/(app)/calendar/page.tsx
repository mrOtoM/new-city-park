import Calendar from '@/components/Calendar'
import TrainingList from '@/components/TrainingList'
import { getTrainings } from '@/services/queries/trainings'
import { getUserRegistrations, getRegistrationCounts } from '@/services/queries/registrations'
import { auth } from '@/lib/auth'

export const revalidate = 0

export const metadata = {
  title: 'Kalendár',
}

export default async function CalendarPage() {
  const [trainings, session] = await Promise.all([getTrainings(), auth()])
  const role = session?.user?.role ?? 'user'
  const [userRegistrations, registrationCounts] = await Promise.all([
    session?.user?.id ? getUserRegistrations(session.user.id) : Promise.resolve([]),
    getRegistrationCounts(),
  ])

  return (
    <div className="mx-auto max-w-6xl">
      <Calendar trainings={trainings} />
      <TrainingList
        trainings={trainings}
        role={role}
        userRegistrations={userRegistrations}
        allowUnregister={false}
        registrationCounts={registrationCounts}
      />
    </div>
  )
}

import Calendar from '@/components/Calendar'
import TrainingList from '@/components/TrainingList'
import { getTrainings } from '@/services/trainings'

export const revalidate = 0

export const metadata = {
  title: 'Kalendár',
}

export default async function CalendarPage() {
  const trainings = await getTrainings()

  return (
    <div className="mx-auto max-w-6xl">
      <Calendar trainings={trainings} />
      <TrainingList trainings={trainings} />
    </div>
  )
}

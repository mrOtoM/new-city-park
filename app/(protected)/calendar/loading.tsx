import CalendarSkeleton from '@/app/(protected)/calendar/_components/CalendarSkeleton'
import TrainingListSkeleton from '@/components/trainings/TrainingListSkeleton'

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Načítavam kalendár" className="mx-auto max-w-6xl">
      <CalendarSkeleton />
      <TrainingListSkeleton rows={2} />
    </div>
  )
}

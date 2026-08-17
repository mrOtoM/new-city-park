import TrainingFormSkeleton from '@/app/(protected)/trainings/_components/TrainingFormSkeleton'
import Skeleton from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Načítavam tréning">
      <div className="border-primary-700 flex border-b">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-1 justify-center py-3">
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <TrainingFormSkeleton />
    </div>
  )
}

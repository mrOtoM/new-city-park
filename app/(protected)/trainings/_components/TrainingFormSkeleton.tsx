import Skeleton from '@/components/ui/Skeleton'

export default function TrainingFormSkeleton() {
  return (
    <div className="mx-auto max-w-6xl p-4">
      <Skeleton className="mb-6 h-8 w-48" />

      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-4 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-4 w-20" />
              <Skeleton className="h-11 rounded-lg" />
            </div>
          ))}
        </div>

        <div>
          <Skeleton className="mb-2 h-4 w-40" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-lg" />
            ))}
          </div>
        </div>

        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-24 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-11 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

import Skeleton from '@/components/ui/Skeleton'

export default function StatisticsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <Skeleton className="h-8 w-40" />

      <div className="-mx-4 flex gap-2 px-4 pb-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-primary-900/50 rounded-lg p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="bg-primary-900/50 flex items-center gap-3 rounded-lg p-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-56" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="bg-primary-900/50 space-y-2 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-40" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

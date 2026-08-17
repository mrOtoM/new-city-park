import Skeleton from '@/components/ui/Skeleton'

export default function CalendarSkeleton() {
  return (
    <div className="mx-auto rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-4" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-4" />
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex h-8 w-8 items-center justify-center">
            <Skeleton className="h-3 w-5" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={index} className="flex h-9 w-9 items-center justify-center">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

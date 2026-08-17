import Skeleton from '@/components/ui/Skeleton'

export default function TrainingListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-4">
      <ul className="flex flex-col space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index} className="bg-primary-900/50 w-full rounded-lg p-3">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-x-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                <div className="flex flex-col space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-2xl" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

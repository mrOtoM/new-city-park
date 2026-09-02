import Skeleton from '@/components/ui/Skeleton'

export default function UsersSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-28" />
      </div>

      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index} className="bg-primary-900/50 space-y-2 rounded-lg p-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-44" />
          </li>
        ))}
      </ul>
    </div>
  )
}

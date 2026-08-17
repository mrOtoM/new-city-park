import Skeleton from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Načítavam profil"
      className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col px-4 py-8"
    >
      <div className="flex-1">
        <div className="mb-8 flex flex-col items-center">
          <Skeleton className="mb-4 h-32 w-32 rounded-full" />
          <Skeleton className="h-7 w-48" />
        </div>

        <div className="mb-8">
          <Skeleton className="mb-4 h-6 w-44" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <Skeleton className="mb-4 h-6 w-28" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>

      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  )
}

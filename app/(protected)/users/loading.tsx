import UsersSkeleton from '@/app/(protected)/users/_components/UsersSkeleton'

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Načítavam používateľov">
      <UsersSkeleton />
    </div>
  )
}

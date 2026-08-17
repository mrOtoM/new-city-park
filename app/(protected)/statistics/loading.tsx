import StatisticsSkeleton from '@/app/(protected)/statistics/_components/StatisticsSkeleton'

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Načítavam štatistiky">
      <StatisticsSkeleton />
    </div>
  )
}

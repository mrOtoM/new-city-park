import TrainingListSkeleton from '@/components/trainings/TrainingListSkeleton'

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Načítavam tréningy" className="mx-auto max-w-6xl">
      <TrainingListSkeleton />
    </div>
  )
}

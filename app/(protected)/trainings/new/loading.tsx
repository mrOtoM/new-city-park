import TrainingFormSkeleton from '@/app/(protected)/trainings/_components/TrainingFormSkeleton'

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Načítavam formulár tréningu">
      <TrainingFormSkeleton />
    </div>
  )
}

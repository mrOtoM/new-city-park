import TrainingForm from '@/app/(protected)/trainings/_components/TrainingForm'
import { createTrainingAction } from '@/services/actions/trainings'
import { requireAdmin } from '@/lib/auth/dal'

export default async function NewTrainingPage() {
  await requireAdmin()

  return <TrainingForm action={createTrainingAction} />
}

import TrainingForm from '@/components/TrainingForm'
import { updateTrainingAction } from '@/lib/actions'
import { getTraining } from '@/services/trainings'
import { notFound } from 'next/navigation'

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const training = await getTraining(Number(id))

  if (!training) {
    notFound()
  }

  return <TrainingForm training={training} action={updateTrainingAction} />
}

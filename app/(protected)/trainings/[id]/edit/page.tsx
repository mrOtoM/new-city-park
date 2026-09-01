import TrainingEditTabs from '@/app/(protected)/trainings/[id]/edit/_components/TrainingEditTabs'
import { updateTrainingAction } from '@/services/actions/trainings'
import { removeParticipantAction } from '@/services/actions/registrations'
import { getTraining } from '@/services/queries/trainings'
import { getTrainingParticipants } from '@/services/queries/registrations'
import { requireAdmin } from '@/lib/auth/dal'
import { notFound } from 'next/navigation'

export default async function EditTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()

  const { id } = await params
  const [training, participants] = await Promise.all([getTraining(Number(id)), getTrainingParticipants(Number(id))])

  if (!training) {
    notFound()
  }

  return (
    <TrainingEditTabs
      training={training}
      action={updateTrainingAction}
      participants={participants}
      onRemoveParticipant={removeParticipantAction}
    />
  )
}

import TrainingEditTabs from '@/components/TrainingEditTabs'
import { updateTrainingAction } from '@/services/actions/trainings'
import { getTraining } from '@/services/queries/trainings'
import { getTrainingParticipants } from '@/services/queries/registrations'
import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'

export default async function EditTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/calendar')

  const { id } = await params
  const [training, participants] = await Promise.all([getTraining(Number(id)), getTrainingParticipants(Number(id))])

  if (!training) {
    notFound()
  }

  return <TrainingEditTabs training={training} action={updateTrainingAction} participants={participants} />
}

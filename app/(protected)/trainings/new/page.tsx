import TrainingForm from '@/app/(protected)/trainings/_components/TrainingForm'
import { createTrainingAction } from '@/services/actions/trainings'
import { auth } from '@/lib/auth/dal'
import { redirect } from 'next/navigation'

export default async function NewTrainingPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/calendar')

  return <TrainingForm action={createTrainingAction} />
}

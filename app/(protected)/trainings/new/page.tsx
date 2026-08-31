import TrainingForm from '@/app/(protected)/trainings/_components/TrainingForm'
import { createTrainingAction } from '@/services/actions/trainings'
import { auth } from '@/lib/auth/dal'
import { hasAdminCapabilities } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'

export default async function NewTrainingPage() {
  const session = await auth()
  if (!hasAdminCapabilities(session?.user?.role)) redirect('/calendar')

  return <TrainingForm action={createTrainingAction} />
}

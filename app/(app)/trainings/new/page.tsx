import TrainingForm from '@/components/TrainingForm'
import { createTrainingAction } from '@/lib/actions'

export default function NewTrainingPage() {
  return <TrainingForm action={createTrainingAction} />
}

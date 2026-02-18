import { Dumbbell, Footprints, Heart, RotateCcw, Timer } from 'lucide-react'

export const TRAINING_TYPES = [
  { value: 'STRENGTH', label: 'Silový tréning', icon: Dumbbell },
  { value: 'STEP', label: 'Step tréning', icon: Footprints },
  { value: 'CARDIO', label: 'Kardio tréning', icon: Heart },
  { value: 'CIRCLE', label: 'Kruhový tréning', icon: RotateCcw },
  { value: 'TABATA', label: 'Tabata tréning', icon: Timer },
] as const

export type TrainingType = (typeof TRAINING_TYPES)[number]['value']

import { Dumbbell, Footprints, Heart, RotateCcw, Timer } from 'lucide-react'

export const TRAINING_TYPES = [
  { value: 'STRENGTH', label: 'Silový tréning', icon: Dumbbell },
  { value: 'STEP', label: 'Step tréning', icon: Footprints },
  { value: 'CARDIO', label: 'Kardio tréning', icon: Heart },
  { value: 'CIRCLE', label: 'Kruhový tréning', icon: RotateCcw },
  { value: 'TABATA', label: 'Tabata tréning', icon: Timer },
] as const

export type TrainingType = (typeof TRAINING_TYPES)[number]['value']

export const UNREGISTER_DEADLINE_OPTIONS = [
  { value: '', label: 'Bez obmedzenia' },
  { value: '6', label: '6 hodín pred' },
  { value: '15', label: '15 hodín pred' },
] as const

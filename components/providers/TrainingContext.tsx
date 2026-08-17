'use client'

import { createContext, useContext, useState } from 'react'

interface TrainingContextType {
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
}

const TrainingContext = createContext<TrainingContextType | null>(null)

function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  return (
    <TrainingContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
      }}
    >
      {children}
    </TrainingContext.Provider>
  )
}

function useTraining() {
  const context = useContext(TrainingContext)
  if (!context) {
    throw new Error('useTraining must be used within a TrainingProvider')
  }
  return context
}

export { TrainingProvider, useTraining }

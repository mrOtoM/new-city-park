'use client'

import { createContext, useContext, useState } from 'react'

interface TrainingContextType {
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
}

const TrainingContext = createContext<TrainingContextType | null>(null)

const initialState = {
  selectedDate: undefined,
}

function TrainingProvider({ children }: any) {
  const [selectedDate, setSelectedDate] = useState<any>(initialState)

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

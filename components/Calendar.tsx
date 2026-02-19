'use client'

import React, { useState } from 'react'
import { useTraining } from './TrainingContext'

interface Training {
  id: number
  type: string
  datetime: string
  note: string
}

interface CalendarProps {
  trainings: Training[]
  onDateSelect?: (date: string) => void
}

export default function Calendar({ trainings, onDateSelect }: CalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const { selectedDate, setSelectedDate } = useTraining()

  const monthNames = [
    'Január',
    'Február',
    'Marec',
    'Apríl',
    'Máj',
    'Jún',
    'Júl',
    'August',
    'September',
    'Október',
    'November',
    'December',
  ]

  const daysOfWeek = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate()

  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay()

  const formatDateString = (day: number) => {
    const month = String(currentMonth + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return `${currentYear}-${month}-${dayStr}`
  }

  const isDatePast = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return date < todayStart
  }

  const hasTrainingOnDate = (day: number) => {
    const dateStr = formatDateString(day)
    return trainings.some((training) => training.datetime.slice(0, 10) === dateStr)
  }

  const isToday = (day: number) => {
    return currentMonth === today.getMonth() && currentYear === today.getFullYear() && day === today.getDate()
  }

  const isSelectedDate = (day: number) => {
    return selectedDate === formatDateString(day)
  }

  const handleDateClick = (day: number) => {
    if (isDatePast(day)) return

    const dateStr = formatDateString(day)
    setSelectedDate(dateStr)

    if (onDateSelect) {
      onDateSelect(dateStr)
    }
  }

  const goToPrevMonth = () => {
    setSelectedDate(null)
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    setSelectedDate(null)
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isPast = isDatePast(day)
      const isCurrentDay = isToday(day)
      const isSelected = isSelectedDate(day)
      const hasTraining = hasTrainingOnDate(day)

      const getDayClasses = () => {
        const baseClasses =
          'relative flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors pt-0.5'

        if (isPast) {
          return `${baseClasses} text-primary-400 opacity-50 cursor-not-allowed`
        }

        if (isCurrentDay) {
          return `${baseClasses} bg-pink-500 text-primary-50 ring-2 ring-pink-300 cursor-pointer`
        }

        if (isSelected) {
          return `${baseClasses} bg-primary-600 text-primary-50 ring-2 ring-primary-700 cursor-pointer`
        }

        if (hasTraining) {
          return `${baseClasses} bg-accent-teal text-primary-50 hover:bg-accent-teal/90 cursor-pointer`
        }

        return `${baseClasses} text-primary-50 hover:bg-primary-600 cursor-pointer`
      }

      days.push(
        <button key={day} onClick={() => handleDateClick(day)} disabled={isPast} className={getDayClasses()}>
          {day}
        </button>,
      )
    }

    return days
  }

  return (
    <div className="mx-auto rounded-lg p-4 text-primary-50">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={goToPrevMonth} className="text-primary-50 hover:text-pink-500">
          ‹
        </button>
        <h2 className="text-lg font-medium">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <button onClick={goToNextMonth} className="text-primary-50 hover:text-pink-500">
          ›
        </button>
      </div>

      {/* Days of week header */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {daysOfWeek.map((day, index) => (
          <div key={index} className="flex h-8 w-8 items-center justify-center text-sm text-primary-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
    </div>
  )
}

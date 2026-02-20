'use client'

import { useState, useTransition } from 'react'
import { Phone, Pencil, Check, X } from 'lucide-react'
import { updatePhoneAction } from '@/services/users'

interface ProfilePhoneProps {
  phone: string
}

export default function ProfilePhone({ phone }: ProfilePhoneProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(phone || '')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updatePhoneAction(value)
        setIsEditing(false)
      } catch (error) {
        console.error(error)
      }
    })
  }

  const handleCancel = () => {
    setValue(phone || '')
    setIsEditing(false)
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="bg-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
        <Phone className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-sm text-primary-50">Kontaktné číslo</p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Telefónne číslo"
              autoFocus
              className="bg-primary-800 border-primary-600 text-primary-50 placeholder:text-primary-600 w-full rounded-md border px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-green-400 hover:text-green-300 disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="text-red-400 hover:text-red-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-primary-400">{phone || '–'}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary-500 hover:text-primary-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

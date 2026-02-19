'use client'

import { useEffect } from 'react'
import Button from './Button'

interface ConfirmSheetProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel = 'Potvrdiť',
  cancelLabel = 'Zrušiť',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 transition-opacity" onClick={loading ? undefined : onCancel} />

      {/* Mobile: Bottom Sheet */}
      <div className="animate-slide-up fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="bg-primary-900 rounded-t-2xl px-6 pt-4 pb-8">
          {/* Handle */}
          <div className="bg-primary-600 mx-auto mb-4 h-1 w-10 rounded-full" />

          <h3 className="text-lg font-semibold text-primary-50">{title}</h3>
          {description && <p className="text-primary-300 mt-2 text-sm">{description}</p>}

          <div className="mt-6 flex gap-3">
            <Button variant="ghost" fullWidth onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} fullWidth onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop: Centered Dialog */}
      <div className="fixed inset-0 z-50 hidden items-center justify-center md:flex">
        <div className="bg-primary-900 w-full max-w-md rounded-2xl px-6 py-6 shadow-xl">
          <h3 className="text-lg font-semibold text-primary-50">{title}</h3>
          {description && <p className="text-primary-300 mt-2 text-sm">{description}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

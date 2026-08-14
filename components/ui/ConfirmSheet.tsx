'use client'

import { useEffect, useRef, useCallback } from 'react'

import Button from '@/components/ui/Button'

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
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) dialog.showModal()
    else dialog.close()
  }, [open])

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      if (!loading) onCancel()
    },
    [loading, onCancel],
  )

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={(e) => {
        if (e.target === dialogRef.current && !loading) onCancel()
      }}
      className="bg-transparent p-0 backdrop:bg-black/50"
    >
      <div className="animate-slide-up fixed inset-x-0 bottom-0 md:hidden">
        <div className="bg-primary-900 rounded-t-2xl px-6 pt-4 pb-8">
          <div className="bg-primary-600 mx-auto mb-4 h-1 w-10 rounded-full" />

          <h3 className="text-primary-50 text-lg font-semibold">{title}</h3>
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

      <div className="fixed inset-0 hidden items-center justify-center md:flex">
        <div className="bg-primary-900 w-full max-w-md rounded-2xl px-6 py-6 shadow-xl">
          <h3 className="text-primary-50 text-lg font-semibold">{title}</h3>
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
    </dialog>
  )
}

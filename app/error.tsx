'use client'

import { useEffect } from 'react'

import Button from '@/components/ui/Button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The detail belongs in the log, not on the screen: a database or provider
  // message can carry table names, ids, or an address.
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-semibold">Niečo sa pokazilo</h1>
      <p className="text-lg">Skúste to prosím znova. Ak problém pretrváva, dajte nám vedieť.</p>
      {error.digest && <p className="text-primary-400 text-sm">Kód chyby: {error.digest}</p>}

      <Button variant="accent" size="lg" onClick={reset}>
        Skúsiť znova
      </Button>
    </main>
  )
}

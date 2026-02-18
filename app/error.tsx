'use client'

import Button from '@/components/Button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-semibold">Niečo sa pokazilo!</h1>
      <p className="text-lg">{error.message}</p>

      <Button variant="accent" size="lg" onClick={reset}>
        Skúsiť znova
      </Button>
    </main>
  )
}

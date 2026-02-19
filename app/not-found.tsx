import Button from '@/components/Button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6 text-center">
      <h1 className="text-2xl font-semibold text-primary-50">
        Táto stránka sa nenašla :(
      </h1>
      <Button variant="secondary" href="/login">
        Vrátiť sa na úvodnú stránku
      </Button>
    </main>
  )
}

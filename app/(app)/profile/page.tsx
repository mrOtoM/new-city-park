import { auth } from '@/lib/auth'
import { User, Mail } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import ProfilePhone from '@/components/ProfilePhone'
import ThemeToggle from '@/components/ThemeToggle'

export default async function ProfilePage() {
  const session = await auth()

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col px-4 py-8">
      <div className="flex-1">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="bg-primary-700 ring-primary-600 mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full ring-4">
            <User className="text-primary-300 h-16 w-16" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-primary-50">
            {session?.user?.name || 'Používateľ'}
          </h1>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-primary-50">
            Osobné informácie
          </h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 flex h-10 w-10 items-center justify-center rounded-md">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="mb-1 text-sm text-primary-50">Meno a priezvisko</p>
                <p className="text-primary-400">{session?.user?.name || ''}</p>
              </div>
            </div>

            <ProfilePhone phone={session?.user?.phone || ''} />

            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 flex h-10 w-10 items-center justify-center rounded-md">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="mb-1 text-sm text-primary-50">Kontaktný email</p>
                <p className="text-primary-400">{session?.user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-primary-50">Nastavenia</h2>
          <div className="space-y-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <SignOutButton />
    </div>
  )
}

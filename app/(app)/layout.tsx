import Navigation from '@/components/Navigation'
import { TrainingProvider } from '@/components/TrainingContext'
import { auth } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <TrainingProvider>
      <div className="flex h-screen flex-col">
        <div className="bg-primary-950 flex-1 overflow-y-auto">{children}</div>
        <div className="bg-primary-900 w-full flex-shrink-0">
          <Navigation role={session?.user?.role} />
        </div>
      </div>
    </TrainingProvider>
  )
}

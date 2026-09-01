import Navigation from '@/components/layout/Navigation'
import { TrainingProvider } from '@/components/providers/TrainingContext'
import { requireUser } from '@/lib/auth/dal'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <TrainingProvider>
      <div className="flex h-screen flex-col">
        <div className="bg-primary-950 flex-1 overflow-y-auto">{children}</div>
        <div className="bg-primary-900 w-full flex-shrink-0">
          <Navigation role={user.role} />
        </div>
      </div>
    </TrainingProvider>
  )
}

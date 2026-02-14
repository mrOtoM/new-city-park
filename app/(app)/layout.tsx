import Navigation from '@/components/Navigation'
import { TrainingProvider } from '@/components/TrainingContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TrainingProvider>
      <div className="flex h-screen flex-col">
        <div className="bg-primary-950 flex-1 overflow-y-auto">{children}</div>
        <div className="bg-primary-900 w-full flex-shrink-0">
          <Navigation />
        </div>
      </div>
    </TrainingProvider>
  )
}

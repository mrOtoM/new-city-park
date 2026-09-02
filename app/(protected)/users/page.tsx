import { CalendarPlus, Mail, Phone } from 'lucide-react'

import { requireCapability } from '@/lib/auth/dal'
import { formatDate } from '@/lib/utils'
import { listRegisteredUsers } from '@/services/queries/users'

export const revalidate = 0

export const metadata = {
  title: 'Používatelia',
}

export default async function UsersPage() {
  await requireCapability('users:view')

  const users = await listRegisteredUsers()

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-primary-50 text-2xl font-semibold">Používatelia</h1>
        <p className="text-primary-400 text-sm">{users.length} registrovaných</p>
      </div>

      {users.length === 0 ? (
        <p className="text-primary-400 text-sm">Zatiaľ sa nikto neregistroval.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="bg-primary-900/50 space-y-2 rounded-lg p-3">
              <p className="text-primary-50 text-sm font-semibold">{user.name}</p>

              <div className="text-primary-300 flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:gap-x-4">
                {user.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">{user.email}</span>
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {user.phone}
                  </span>
                )}
              </div>

              <p className="text-primary-500 flex items-center gap-1.5 text-xs">
                <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
                Registrovaný {formatDate(user.registeredAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

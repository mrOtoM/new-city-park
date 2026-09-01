'use client'

import Link from 'next/link'
import { BarChart3, CalendarDays, User, ListCheck } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { type Capability, type Role, can } from '@/lib/auth/roles'

const navLinks = [
  {
    name: 'Kalendár',
    href: '/calendar',
    icon: <CalendarDays className="h-7 w-7" />,
  },
  {
    name: 'Tréningy',
    href: '/trainings',
    icon: <ListCheck className="h-7 w-7" />,
  },
  {
    name: 'Štatistiky',
    href: '/statistics',
    icon: <BarChart3 className="h-7 w-7" />,
    capability: 'statistics:view' as Capability,
  },
  {
    name: 'Profil',
    href: '/profile',
    icon: <User className="h-7 w-7" />,
  },
]

export default function Navigation({ role = 'user' }: { role?: Role }) {
  const pathname = usePathname()
  // Visibility only; the pages behind these links authorize themselves.
  const visibleLinks = navLinks.filter((link) => !link.capability || can(role, link.capability))

  return (
    <nav className="mx-auto h-20 max-w-6xl">
      <ul className="flex h-full max-w-6xl items-center justify-between">
        {visibleLinks.map((link) => (
          <li key={link.name}>
            <Link
              className={`hover:text-primary-100 text-primary-400 flex w-24 flex-col items-center gap-y-2 font-semibold transition-colors ${
                pathname === link.href ? 'text-primary-50' : ''
              }`}
              href={link.href}
            >
              {link.icon}
              <span className="text-sm">{link.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

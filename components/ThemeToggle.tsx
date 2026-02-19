'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="bg-primary-600 flex h-10 w-10 items-center justify-center rounded-md">
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </div>
        <div>
          <p className="mb-1 text-sm text-primary-50">Vzhľad</p>
          <p className="text-primary-400">{isDark ? 'Tmavý mód' : 'Svetlý mód'}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="bg-primary-800 border-primary-700 rounded-lg border px-4 py-2 text-sm font-medium text-primary-200 transition-colors hover:border-primary-500"
      >
        {isDark ? 'Svetlý' : 'Tmavý'}
      </button>
    </div>
  )
}

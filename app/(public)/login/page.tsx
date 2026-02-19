'use client'

import Image from 'next/image'
import bg6 from '@/public/bg6.png'
import Link from 'next/link'
import Button from '@/components/Button'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Nesprávne prihlasovacie údaje')
      setLoading(false)
      return
    }

    router.push('/calendar')
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('Nepodarilo sa prihlásiť cez Google')
      setGoogleLoading(false)
    }
  }

  const inputClass =
    'bg-primary-900 text-primary-50 placeholder:text-primary-400 focus:ring-primary-600 w-full rounded-lg border border-transparent px-4 py-3 focus:ring-2 focus:outline-none'

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary-900">
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-primary-950 sm:mx-auto sm:min-h-auto sm:max-w-sm sm:rounded-2xl sm:border sm:border-primary-800 sm:shadow-lg">
        <div className="relative h-[34vh] flex-none bg-primary-800 sm:h-54">
          <Image src={bg6} quality={80} alt="hero" fill className="flex-1 object-cover" />
        </div>

        <div className="flex flex-1 flex-col overflow-auto p-6">
          <h2 className="text-center text-xl font-semibold text-primary-200">New City Park</h2>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Heslo
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="flex justify-end">
              <Link href="#" className="text-sm text-primary-400 hover:underline">
                Zabudli ste heslo?
              </Link>
            </div>

            <div>
              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Prihlásiť sa
              </Button>
            </div>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-primary-700" />
            <span className="text-xs text-primary-400">alebo</span>
            <div className="h-px flex-1 bg-primary-700" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="mt-4 mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-primary-700 bg-primary-900 px-4 py-3 text-sm font-medium text-primary-200 transition-colors hover:bg-primary-800 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleLoading ? 'Presmerovanie...' : 'Prihlásiť sa cez Google'}
          </button>
          <div className="mt-auto text-center text-sm text-primary-400">
            Nemáte účet?{' '}
            <Link href="/register" className="font-medium text-primary-300 hover:underline">
              Zaregistrovať sa
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-white sm:mx-auto sm:min-h-auto sm:max-w-sm sm:rounded-2xl sm:border sm:border-gray-100 sm:shadow-lg">
        <div className="relative h-[34vh] flex-none bg-gray-200 sm:h-54">
          <Image
            src={bg6}
            quality={80}
            alt="hero"
            fill
            className="flex-1 object-cover"
          />
        </div>

        <div className="flex flex-1 flex-col overflow-auto p-6">
          <h2 className="text-primary-950 text-center text-xl font-semibold">
            New City Park
          </h2>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {error && (
              <p className="text-primary-500 text-center text-sm">{error}</p>
            )}
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
                className="bg-primary-50 text-primary-950 placeholder:text-primary-300 focus:ring-primary-200 focus:bg-primary-50 w-full rounded-lg border border-transparent px-4 py-3 focus:ring-2 focus:outline-none"
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
                className="bg-primary-50 text-primary-950 placeholder:text-primary-300 focus:ring-primary-200 w-full rounded-lg border border-transparent px-4 py-3 focus:ring-2 focus:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Link
                href="#"
                className="text-primary-600 text-sm hover:underline"
              >
                Zabudli ste heslo?
              </Link>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
              >
                Prihlásiť sa
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center"></div>
          <div className="text-primary-400 mt-auto text-center text-sm">
            Nemáte účet?{' '}
            <Link
              href="/register"
              className="text-primary-600 font-medium hover:underline"
            >
              Zaregistrovať sa
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

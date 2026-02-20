'use client'

import Image from 'next/image'
import bg6 from '@/public/bg6.png'
import Link from 'next/link'
import Button from '@/components/Button'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useState } from 'react'
import { Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
    })

    if (error) {
      if (error.status === 429 || error.message.includes('rate')) {
        setError('Príliš veľa pokusov. Skúste to neskôr.')
      } else {
        setError('Nepodarilo sa odoslať email. Skúste to znova.')
      }
      setLoading(false)
      return
    }

    setEmailSent(true)
    setLoading(false)
  }

  const inputClass =
    'bg-primary-900 text-primary-50 placeholder:text-primary-400 focus:ring-primary-600 w-full rounded-lg border border-transparent px-4 py-3 focus:ring-2 focus:outline-none'

  return (
    <main className="bg-primary-900 flex min-h-screen items-center justify-center">
      <div className="bg-primary-950 sm:border-primary-800 flex min-h-screen w-full flex-col overflow-hidden rounded-none sm:mx-auto sm:min-h-auto sm:max-w-sm sm:rounded-2xl sm:border sm:shadow-lg">
        <div className="bg-primary-800 relative h-[34vh] flex-none sm:h-54">
          <Image src={bg6} quality={80} alt="hero" fill className="flex-1 object-cover" />
        </div>

        <div className="flex flex-1 flex-col overflow-auto p-6">
          <h2 className="text-primary-200 text-center text-xl font-semibold">
            {emailSent ? 'Email odoslaný' : 'Obnovenie hesla'}
          </h2>

          {emailSent ? (
            <div className="mt-8 space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-primary-300 text-sm">
                Na adresu <strong>{email}</strong> sme odoslali odkaz na obnovenie hesla.
              </p>
              <p className="text-primary-400 text-xs">Kliknite na odkaz v emaile pre nastavenie nového hesla.</p>
              <p className="text-primary-500 text-xs">Ak email nevidíte, skontrolujte priečinok so spamom.</p>
              <div className="pt-4">
                <Link href="/login" className="text-primary-300 text-sm font-medium hover:underline">
                  Späť na prihlásenie
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-primary-400 mt-4 text-center text-sm">
                Zadajte email a pošleme vám odkaz na obnovenie hesla.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && <p className="text-center text-sm text-red-400">{error}</p>}
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <Button type="submit" variant="primary" fullWidth loading={loading}>
                    Odoslať odkaz
                  </Button>
                </div>
              </form>
              <div className="text-primary-400 mt-auto pt-6 text-center text-sm">
                <Link href="/login" className="text-primary-300 font-medium hover:underline">
                  Späť na prihlásenie
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

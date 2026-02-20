'use client'

import Image from 'next/image'
import bg6 from '@/public/bg6.png'
import Link from 'next/link'
import Button from '@/components/Button'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Heslá sa nezhodujú')
      return
    }

    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Heslo musí mať aspoň 8 znakov, obsahovať malé písmeno, veľké písmeno a číslicu')
      return
    }

    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Nepodarilo sa zmeniť heslo. Skúste to znova.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
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
          <h2 className="text-center text-xl font-semibold text-primary-200">
            {success ? 'Heslo zmenené' : 'Nové heslo'}
          </h2>

          {success ? (
            <div className="mt-8 space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-primary-300">Vaše heslo bolo úspešne zmenené.</p>
              <div className="pt-4">
                <Link href="/login" className="text-sm font-medium text-primary-300 hover:underline">
                  Prihlásiť sa
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-4 text-center text-sm text-primary-400">Zadajte nové heslo pre váš účet.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && <p className="text-center text-sm text-red-400">{error}</p>}
                <div>
                  <label htmlFor="password" className="sr-only">
                    Nové heslo
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Nové heslo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="passwordConfirm" className="sr-only">
                    Zopakujte heslo
                  </label>
                  <input
                    id="passwordConfirm"
                    type="password"
                    placeholder="Zopakujte heslo"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <Button type="submit" variant="primary" fullWidth loading={loading}>
                    Zmeniť heslo
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

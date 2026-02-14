'use client'

import Image from 'next/image'
import bg6 from '@/public/bg6.png'
import Link from 'next/link'
import Button from '@/components/Button'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Heslá sa nezhodujú')
      return
    }

    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov')
      return
    }

    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
        },
      },
    })

    if (error) {
      if (error.status === 429 || error.message.includes('rate')) {
        setError('Príliš veľa pokusov. Skúste to neskôr.')
      } else if (error.message.includes('invalid')) {
        setError('Neplatná emailová adresa')
      } else if (error.message.includes('already registered')) {
        setError('Tento email je už zaregistrovaný')
      } else {
        setError('Registrácia sa nepodarila. Skúste to znova.')
      }
      setLoading(false)
      return
    }

    router.push('/calendar')
    router.refresh()
  }

  const inputClass =
    'bg-primary-50 text-primary-950 placeholder:text-primary-300 focus:ring-primary-200 w-full rounded-lg border border-transparent px-4 py-3 focus:ring-2 focus:outline-none'

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
          <h2 className="text-center text-xl font-semibold text-primary-950">
            Registrácia
          </h2>
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            {error && (
              <p className="text-center text-sm text-primary-500">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="sr-only">
                  Meno
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Meno"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="sr-only">
                  Priezvisko
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Priezvisko"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

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
              <label htmlFor="phone" className="sr-only">
                Telefónne číslo
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="Telefónne číslo"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Heslo
              </label>
              <input
                id="password"
                type="password"
                placeholder="Heslo"
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
                Zaregistrovať sa
              </Button>
            </div>
          </form>

          <div className="mt-auto pt-4 text-center text-sm text-primary-400">
            Už máte účet?{' '}
            <Link
              href="/login"
              className="text-primary-600 font-medium hover:underline"
            >
              Prihlásiť sa
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

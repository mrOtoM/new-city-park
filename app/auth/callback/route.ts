import { safeNextPath } from '@/lib/auth/redirects'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  let exchanged = false

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    exchanged = !error
  }

  if (type === 'recovery') {
    // Without a session the reset form can only fail, so send the user to request a new link instead.
    return NextResponse.redirect(`${origin}${exchanged ? '/reset-password' : '/forgot-password?expired=1'}`)
  }

  return NextResponse.redirect(new URL(safeNextPath(searchParams.get('next')), origin))
}

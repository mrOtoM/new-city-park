import { createSupabaseServerClient } from './supabase-server'

// Získanie aktuálneho usera zo session (server-side)
export async function auth() {
  const supabaseServer = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) return null

  // Načítaj profil z public.users (cez server klienta s cookies = RLS funguje)
  const { data: profile } = await supabaseServer
    .from('users')
    .select('id, fullName, email, phoneNumber, role')
    .eq('id', user.id)
    .single()

  return {
    user: {
      id: user.id,
      email: user.email,
      name: profile?.fullName || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || '',
      phone: profile?.phoneNumber || '',
      role: profile?.role || 'user',
      userId: profile?.id,
    },
  }
}

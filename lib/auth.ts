import { createSupabaseServerClient } from './supabase-server'

export async function auth() {
  const supabaseServer = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabaseServer
    .from('users')
    .select('id, fullName, email, phoneNumber, role')
    .eq('id', user.id)
    .single()

  return {
    user: {
      id: user.id,
      email: user.email,
      name:
        profile?.fullName ||
        `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
        '',
      phone: profile?.phoneNumber || '',
      role: profile?.role || 'user',
      userId: profile?.id,
    },
  }
}

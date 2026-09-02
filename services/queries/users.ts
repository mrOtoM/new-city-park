import { requireCapability } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { RegisteredUser } from '@/lib/types'

export async function updateUserPhone(userId: string, phone: string) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from('users').update({ phoneNumber: phone }).eq('id', userId)

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa aktualizovať telefónne číslo')
  }
}

/**
 * Registrovaní účastníci, najnovší hore. Vracia osobné údaje, takže si
 * kapabilitu overuje sám a nespolieha sa na volajúcu stránku. Admin a owner
 * čítajú cudzie profily cez RLS politiku "Admin can view all users", preto
 * stačí cookie-viazaný klient a nie service-role.
 */
export async function listRegisteredUsers(): Promise<RegisteredUser[]> {
  await requireCapability('users:view')

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, fullName, email, phoneNumber, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data.map((user) => ({
    id: user.id,
    name: user.fullName || 'Neznámy',
    email: user.email || null,
    phone: user.phoneNumber || null,
    registeredAt: user.created_at,
  }))
}

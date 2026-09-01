import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function updateUserPhone(userId: string, phone: string) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from('users').update({ phoneNumber: phone }).eq('id', userId)

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa aktualizovať telefónne číslo')
  }
}

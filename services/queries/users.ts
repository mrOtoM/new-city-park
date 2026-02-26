import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function getUserByAuthId(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

export async function getUser(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  return data
}

export async function updateUserPhone(userId: string, phone: string) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ phoneNumber: phone })
    .eq('id', userId)

  if (error) {
    console.error(error)
    throw new Error('Nepodarilo sa aktualizovať telefónne číslo')
  }
}

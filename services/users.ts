'use server'

import { supabase, supabaseAdmin } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

// --- Server Actions ---

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updatePhoneAction(phone: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await updateUserPhone(session.user.id, phone)
  revalidatePath('/profile')
}

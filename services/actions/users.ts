'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/dal'
import { updateUserPhone } from '@/services/queries/users'

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()

  await supabase.auth.signOut()

  redirect('/login')
}

export async function updatePhoneAction(phone: string) {
  const user = await requireUser()

  await updateUserPhone(user.id, phone)

  revalidatePath('/profile')
}

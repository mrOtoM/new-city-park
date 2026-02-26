'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { auth } from '@/lib/auth'
import { updateUserPhone } from '@/services/queries/users'

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

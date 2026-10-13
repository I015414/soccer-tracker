import { supabase } from './supabase'

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && email === import.meta.env.VITE_ADMIN_EMAIL
}

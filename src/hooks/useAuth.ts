import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'viewer' | null

export function useAuth() {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('app_role') as UserRole) || null
  })

  async function login(password: string): Promise<UserRole> {
    const { data } = await supabase.from('app_settings').select('*')
    const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]))
    if (password === settings.admin_password) {
      localStorage.setItem('app_role', 'admin')
      setRole('admin')
      return 'admin'
    } else if (password === settings.viewer_password) {
      localStorage.setItem('app_role', 'viewer')
      setRole('viewer')
      return 'viewer'
    }
    return null
  }

  function logout() {
    localStorage.removeItem('app_role')
    setRole(null)
  }

  return { role, login, logout }
}
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'viewer' | null

export function useAuth() {
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('app_role') as UserRole
    const savedToken = localStorage.getItem('session_token')
    const currentToken = localStorage.getItem('current_token')
    if (savedRole && savedToken && savedToken === currentToken) return savedRole
    return null
  })

  async function checkToken(): Promise<boolean> {
    const { data } = await supabase.from('app_settings').select('*')
    const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]))
    const currentToken = settings.session_token
    localStorage.setItem('current_token', currentToken)
    const savedToken = localStorage.getItem('session_token')
    return savedToken === currentToken
  }

  async function login(password: string): Promise<UserRole> {
    const { data } = await supabase.from('app_settings').select('*')
    const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]))
    if (password === settings.admin_password) {
      localStorage.setItem('app_role', 'admin')
      localStorage.setItem('session_token', settings.session_token)
      localStorage.setItem('current_token', settings.session_token)
      setRole('admin')
      return 'admin'
    } else if (password === settings.viewer_password) {
      localStorage.setItem('app_role', 'viewer')
      localStorage.setItem('session_token', settings.session_token)
      localStorage.setItem('current_token', settings.session_token)
      setRole('viewer')
      return 'viewer'
    }
    return null
  }

  function logout() {
    localStorage.removeItem('app_role')
    localStorage.removeItem('session_token')
    localStorage.removeItem('current_token')
    setRole(null)
  }

  return { role, login, logout, checkToken }
}
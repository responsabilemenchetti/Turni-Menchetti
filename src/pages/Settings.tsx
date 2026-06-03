import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LogOut } from 'lucide-react'

interface Props {
  onLogout: () => void
}

export function Settings({ onLogout }: Props) {
  const [adminPassword, setAdminPassword] = useState('')
  const [viewerPassword, setViewerPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('app_settings').select('*')
    const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]))
    setAdminPassword(settings.admin_password || '')
    setViewerPassword(settings.viewer_password || '')
    setLoading(false)
  }

  async function save() {
    await Promise.all([
      supabase.from('app_settings').update({ value: adminPassword }).eq('key', 'admin_password'),
      supabase.from('app_settings').update({ value: viewerPassword }).eq('key', 'viewer_password')
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Caricamento...</div>

  return (
    <div className="p-4 space-y-6" style={{paddingBottom: '120px'}}>
      <h2 className="text-lg font-semibold text-gray-800">Impostazioni</h2>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <h3 className="font-medium text-gray-700">Password di accesso</h3>
        <div>
          <p className="text-xs text-gray-500 mb-1">Password Admin</p>
          <input type="text" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Password Dipendenti (sola lettura)</p>
          <input type="text" value={viewerPassword} onChange={e => setViewerPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <button onClick={save}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium">
          {saved ? '✓ Salvato!' : 'Salva password'}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-500 font-medium py-2">
          <LogOut size={18} /> Esci
        </button>
      </div>
    </div>
  )
}
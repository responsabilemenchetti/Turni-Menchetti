import { useState } from 'react'
import type { UserRole } from '../hooks/useAuth'

interface Props {
  onLogin: (password: string) => Promise<UserRole>
}

export function Login({ onLogin }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError(false)
    const role = await onLogin(password)
    if (!role) setError(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🥐</p>
          <h1 className="text-2xl font-bold text-gray-900">Turni Menchetti</h1>
          <p className="text-gray-500 mt-1">Inserisci la password per accedere</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-sm text-center">Password errata, riprova!</p>}
          <button onClick={handleLogin} disabled={loading || !password}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-40">
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </div>
      </div>
    </div>
  )
}
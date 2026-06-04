import { useState, useEffect } from 'react'
import { Employees } from './pages/Employees'
import { Planner } from './pages/Planner'
import { Templates } from './pages/Templates'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { useAuth } from './hooks/useAuth'
import { Users, CalendarDays, Clock, Settings as SettingsIcon } from 'lucide-react'
import './App.css'

type Page = 'planner' | 'employees' | 'templates' | 'settings'

function App() {
  const { role, login, logout, checkToken } = useAuth()

  useEffect(() => {
    if (role) {
      checkToken().then(valid => {
        if (!valid) logout()
      })
    }
  }, [])
  const [currentPage, setCurrentPage] = useState<Page>('planner')

  if (!role) return <Login onLogin={login} />

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">🥐 Turni Menchetti</h1>
      </header>

      {/* Content */}
      <main className="pb-32">
        {currentPage === 'planner' && <Planner role={role} />}
        {currentPage === 'employees' && <Employees role={role} />}
        {currentPage === 'templates' && <Templates role={role} />}
        {currentPage === 'settings' && role === 'admin' && <Settings onLogout={logout} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button onClick={() => setCurrentPage('planner')}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 ${currentPage === 'planner' ? 'text-blue-600' : 'text-gray-500'}`}>
            <CalendarDays size={22} /> Turni
          </button>
          {role === 'admin' && (
            <button onClick={() => setCurrentPage('employees')}
              className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 ${currentPage === 'employees' ? 'text-blue-600' : 'text-gray-500'}`}>
              <Users size={22} /> Dipendenti
            </button>
          )}
          {role === 'admin' && (
            <button onClick={() => setCurrentPage('templates')}
              className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 ${currentPage === 'templates' ? 'text-blue-600' : 'text-gray-500'}`}>
              <Clock size={22} /> Orari
            </button>
          )}
          {role === 'admin' && (
            <button onClick={() => setCurrentPage('settings')}
              className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 ${currentPage === 'settings' ? 'text-blue-600' : 'text-gray-500'}`}>
              <SettingsIcon size={22} /> Impostazioni
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}

export default App
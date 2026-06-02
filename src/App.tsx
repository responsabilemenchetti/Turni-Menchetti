import { useState } from 'react'
import { Employees } from './pages/Employees'
import { Planner } from './pages/Planner'
import { Templates } from './pages/Templates'
import { Users, CalendarDays, Clock } from 'lucide-react'
import './App.css'

type Page = 'planner' | 'employees' | 'templates'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('planner')

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">🥐 Turni Menchetti</h1>
      </header>

      {/* Content */}
      <main className="pb-32">
        {currentPage === 'planner' && <Planner />}
        {currentPage === 'employees' && <Employees />}
        {currentPage === 'templates' && <Templates />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button
            onClick={() => setCurrentPage('planner')}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 ${currentPage === 'planner' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <CalendarDays size={22} />
            Turni
          </button>
          <button
            onClick={() => setCurrentPage('employees')}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 ${currentPage === 'employees' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Users size={22} />
            Dipendenti
          </button>
          <button
            onClick={() => setCurrentPage('templates')}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 ${currentPage === 'templates' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Clock size={22} />
            Orari
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App

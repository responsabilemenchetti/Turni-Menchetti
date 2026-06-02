import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/index'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4', '#A855F7'
]

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', role: '', color: '#3B82F6', notes: ''
  })

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    const { data } = await supabase.from('employees').select('*').order('first_name')
    setEmployees(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ first_name: '', last_name: '', role: '', color: '#3B82F6', notes: '' })
    setShowForm(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setForm({ first_name: emp.first_name, last_name: emp.last_name, role: emp.role, color: emp.color, notes: emp.notes || '' })
    setShowForm(true)
  }

  async function save() {
    if (!form.first_name || !form.last_name || !form.role) return
    if (editing) {
      await supabase.from('employees').update(form).eq('id', editing.id)
    } else {
      await supabase.from('employees').insert(form)
    }
    setShowForm(false)
    loadEmployees()
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questo dipendente?')) return
    await supabase.from('employees').delete().eq('id', id)
    loadEmployees()
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Caricamento...</div>

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Dipendenti ({employees.length})</h2>
        <button onClick={openNew} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm">
          <Plus size={16} /> Aggiungi
        </button>
      </div>

      <div className="space-y-2">
        {employees.map(emp => (
          <div key={emp.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: emp.color }}>
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
              <p className="text-sm text-gray-500">{emp.role}</p>
            </div>
            <button onClick={() => openEdit(emp)} className="p-2 text-gray-400 hover:text-blue-600">
              <Pencil size={16} />
            </button>
            <button onClick={() => remove(emp.id)} className="p-2 text-gray-400 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {employees.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nessun dipendente. Aggiungine uno!</p>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{editing ? 'Modifica' : 'Nuovo'} Dipendente</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome *"
              value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Cognome *"
              value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ruolo *"
              value={form.role} onChange={e => setForm({...form, role: e.target.value})} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Note (opzionale)"
              value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            <div>
              <p className="text-sm text-gray-600 mb-2">Colore</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm({...form, color: c})}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: c }}>
                    {form.color === c && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={save} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium">
              {editing ? 'Salva modifiche' : 'Aggiungi dipendente'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

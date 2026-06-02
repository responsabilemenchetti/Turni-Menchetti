import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ShiftTemplate, AbsenceType } from '../types/index'
import { Plus, Pencil, Trash2, X, Moon } from 'lucide-react'

export function Templates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAbsenceForm, setShowAbsenceForm] = useState(false)
  const [editing, setEditing] = useState<ShiftTemplate | null>(null)
  const [editingAbsence, setEditingAbsence] = useState<AbsenceType | null>(null)
  const [form, setForm] = useState({ name: '', start_time: '', end_time: '', is_rest_day: false })
  const [absenceForm, setAbsenceForm] = useState({ name: '', icon: '', color: '#6B7280' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [tplRes, absRes] = await Promise.all([
      supabase.from('shift_templates').select('*'),
      supabase.from('absence_types').select('*').order('name')
    ])
    const sorted = (tplRes.data || []).sort((a, b) => {
      if (a.is_rest_day && !b.is_rest_day) return 1
      if (!a.is_rest_day && b.is_rest_day) return -1
      if (a.is_rest_day && b.is_rest_day) return 0
      if (a.start_time !== b.start_time) return a.start_time > b.start_time ? 1 : -1
      return a.end_time > b.end_time ? 1 : -1
    })
    setTemplates(sorted)
    setAbsenceTypes(absRes.data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ name: '', start_time: '', end_time: '', is_rest_day: false })
    setShowForm(true)
  }

  function openEdit(t: ShiftTemplate) {
    setEditing(t)
    setForm({ name: t.name, start_time: t.start_time || '', end_time: t.end_time || '', is_rest_day: t.is_rest_day })
    setShowForm(true)
  }

  async function save() {
    if (!form.name) return
    const data = {
      name: form.name,
      start_time: form.is_rest_day ? null : form.start_time,
      end_time: form.is_rest_day ? null : form.end_time,
      is_rest_day: form.is_rest_day
    }
    if (editing) {
      await supabase.from('shift_templates').update(data).eq('id', editing.id)
    } else {
      await supabase.from('shift_templates').insert(data)
    }
    setShowForm(false)
    loadAll()
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questo orario?')) return
    await supabase.from('shift_templates').delete().eq('id', id)
    loadAll()
  }

  function openNewAbsence() {
    setEditingAbsence(null)
    setAbsenceForm({ name: '', icon: '', color: '#6B7280' })
    setShowAbsenceForm(true)
  }

  function openEditAbsence(a: AbsenceType) {
    setEditingAbsence(a)
    setAbsenceForm({ name: a.name, icon: a.icon, color: a.color })
    setShowAbsenceForm(true)
  }

  async function saveAbsence() {
    if (!absenceForm.name || !absenceForm.icon) return
    const data = { name: absenceForm.name, icon: absenceForm.icon, color: absenceForm.color }
    if (editingAbsence) {
      await supabase.from('absence_types').update(data).eq('id', editingAbsence.id)
    } else {
      await supabase.from('absence_types').insert(data)
    }
    setShowAbsenceForm(false)
    loadAll()
  }

  async function removeAbsence(id: string) {
    if (!confirm('Eliminare questo tipo di assenza?')) return
    await supabase.from('absence_types').delete().eq('id', id)
    loadAll()
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Caricamento...</div>

  return (
    <div className="p-4 space-y-6">
      {/* SEZIONE ORARI */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Orari ({templates.length})</h2>
          <button onClick={openNew} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm">
            <Plus size={16} /> Aggiungi
          </button>
        </div>
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.is_rest_day ? 'bg-gray-100' : 'bg-blue-100'}`}>
                {t.is_rest_day ? <Moon size={18} className="text-gray-500" /> :
                  <span className="text-blue-600 font-bold text-xs">{t.start_time?.slice(0,5)}</span>}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">
                  {t.is_rest_day ? 'Giorno di riposo' : `${t.start_time} → ${t.end_time}`}
                </p>
              </div>
              <button onClick={() => openEdit(t)} className="p-2 text-gray-400 hover:text-blue-600">
                <Pencil size={16} />
              </button>
              <button onClick={() => remove(t.id)} className="p-2 text-gray-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SEZIONE TIPI DI ASSENZA */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Tipi di assenza ({absenceTypes.length})</h2>
          <button onClick={openNewAbsence} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm">
            <Plus size={16} /> Aggiungi
          </button>
        </div>
        <div className="space-y-2">
          {absenceTypes.map(a => (
            <div key={a.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                style={{ backgroundColor: a.color + '22' }}>
                {a.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{a.name}</p>
                <p className="text-sm" style={{ color: a.color }}>{a.color}</p>
              </div>
              <button onClick={() => openEditAbsence(a)} className="p-2 text-gray-400 hover:text-blue-600">
                <Pencil size={16} />
              </button>
              <button onClick={() => removeAbsence(a.id)} className="p-2 text-gray-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Form Orario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{editing ? 'Modifica' : 'Nuovo'} Orario</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome orario (es. Apertura) *"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.is_rest_day}
                onChange={e => setForm({...form, is_rest_day: e.target.checked})} />
              Giorno di riposo
            </label>
            {!form.is_rest_day && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Inizio</p>
                  <input type="time" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Fine</p>
                  <input type="time" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
                </div>
              </div>
            )}
            <button onClick={save} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium">
              {editing ? 'Salva modifiche' : 'Aggiungi orario'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Form Assenza */}
      {showAbsenceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{editingAbsence ? 'Modifica' : 'Nuovo'} Tipo di assenza</h3>
              <button onClick={() => setShowAbsenceForm(false)}><X size={20} /></button>
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome (es. Ferie) *"
              value={absenceForm.name} onChange={e => setAbsenceForm({...absenceForm, name: e.target.value})} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Emoji icona (es. 🏖️) *"
              value={absenceForm.icon} onChange={e => setAbsenceForm({...absenceForm, icon: e.target.value})} />
            <div>
              <p className="text-xs text-gray-500 mb-1">Colore</p>
              <div className="flex items-center gap-3">
                <input type="color" value={absenceForm.color}
                  onChange={e => setAbsenceForm({...absenceForm, color: e.target.value})}
                  className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                <span className="text-sm text-gray-600">{absenceForm.color}</span>
              </div>
            </div>
            <button onClick={saveAbsence} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium">
              {editingAbsence ? 'Salva modifiche' : 'Aggiungi tipo di assenza'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
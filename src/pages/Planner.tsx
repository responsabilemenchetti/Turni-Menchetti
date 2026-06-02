import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee, ShiftTemplate, Shift } from '../types/index'
import { ChevronLeft, ChevronRight, X, Moon, LayoutGrid, List } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns'
import { it } from 'date-fns/locale'

type ViewMode = 'week' | 'month-grid' | 'month-list'

export function Planner() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{employee: Employee, date: string} | null>(null)
  const [customStart, setCustomStart] = useState('')
const [customEnd, setCustomEnd] = useState('')
const [customStart2, setCustomStart2] = useState('')
const [customEnd2, setCustomEnd2] = useState('')
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i))
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => { loadAll() }, [currentDate, viewMode])

  async function loadAll() {
    setLoading(true)
    let dateFrom, dateTo
    if (viewMode === 'week') {
      dateFrom = format(days[0], 'yyyy-MM-dd')
      dateTo = format(days[6], 'yyyy-MM-dd')
    } else {
      dateFrom = format(monthStart, 'yyyy-MM-dd')
      dateTo = format(monthEnd, 'yyyy-MM-dd')
    }
    const [empRes, tplRes, shiftRes] = await Promise.all([
      supabase.from('employees').select('*').order('first_name'),
      supabase.from('shift_templates').select('*'),
      supabase.from('shifts').select('*').gte('date', dateFrom).lte('date', dateTo)
    ])
    setEmployees(empRes.data || [])
    const sortedTemplates = (tplRes.data || []).sort((a, b) => {
  if (a.is_rest_day && !b.is_rest_day) return 1
  if (!a.is_rest_day && b.is_rest_day) return -1
  if (a.is_rest_day && b.is_rest_day) return 0
  if (a.start_time !== b.start_time) return a.start_time > b.start_time ? 1 : -1
  return a.end_time > b.end_time ? 1 : -1
})
setTemplates(sortedTemplates)
    setShifts(shiftRes.data || [])
    setLoading(false)
  }

  function getShift(employeeId: string, date: string) {
    return shifts.find(s => s.employee_id === employeeId && s.date === date)
  }

  function openCell(employee: Employee, date: string) {
    setCustomStart('')
    setCustomEnd('')
    setCustomStart2('')
    setCustomEnd2('')
    setSelectedCell({ employee, date })
    setShowModal(true)
  }

  async function applyTemplate(template: ShiftTemplate) {
    if (!selectedCell) return
    const existing = getShift(selectedCell.employee.id, selectedCell.date)
    const data = {
      employee_id: selectedCell.employee.id,
      date: selectedCell.date,
      start_time: template.start_time || null,
      end_time: template.end_time || null,
      template_id: template.id,
      is_rest_day: template.is_rest_day
    }
    if (existing) {
      await supabase.from('shifts').update(data).eq('id', existing.id)
    } else {
      await supabase.from('shifts').insert(data)
    }
    setShowModal(false)
    loadAll()
  }

  async function applyCustomShift() {
    if (!selectedCell || !customStart || !customEnd) return
    const existing = getShift(selectedCell.employee.id, selectedCell.date)
    const data = {
      employee_id: selectedCell.employee.id,
      date: selectedCell.date,
      start_time: customStart,
      end_time: customEnd,
      start_time_2: customStart2 || null,
      end_time_2: customEnd2 || null,
      template_id: null,
      is_rest_day: false
    }
    if (existing) {
      await supabase.from('shifts').update(data).eq('id', existing.id)
    } else {
      await supabase.from('shifts').insert(data)
    }
    setShowModal(false)
    loadAll()
  }

  async function deleteShift() {
    if (!selectedCell) return
    const existing = getShift(selectedCell.employee.id, selectedCell.date)
    if (existing) await supabase.from('shifts').delete().eq('id', existing.id)
    setShowModal(false)
    loadAll()
  }

  function calcHours(employeeId: string, dayList: Date[]) {
    return shifts
      .filter(s => s.employee_id === employeeId && !s.is_rest_day && s.start_time && s.end_time
        && dayList.some(d => format(d, 'yyyy-MM-dd') === s.date))
      .reduce((acc, s) => {
        const [sh, sm] = s.start_time!.split(':').map(Number)
        const [eh, em] = s.end_time!.split(':').map(Number)
        return acc + (eh * 60 + em - sh * 60 - sm) / 60
      }, 0)
  }

  function prev() {
    if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(subMonths(currentDate, 1))
  }

  function next() {
    if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addMonths(currentDate, 1))
  }

  if (loading) return <div className="p-4 text-center text-gray-500">Caricamento...</div>

  return (
    <div className="p-2">
      {/* Header navigazione */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={prev} className="p-2 rounded-lg bg-white shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          {viewMode === 'week' ? (
            <p className="font-semibold text-gray-900 text-sm">
              {format(days[0], 'd MMM', {locale: it})} — {format(days[6], 'd MMM yyyy', {locale: it})}
            </p>
          ) : (
            <p className="font-semibold text-gray-900 text-sm">
              {format(currentDate, 'MMMM yyyy', {locale: it})}
            </p>
          )}
        </div>
        <button onClick={next} className="p-2 rounded-lg bg-white shadow-sm">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Selettore vista */}
      <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setViewMode('week')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
          Settimana
        </button>
        <button onClick={() => setViewMode('month-grid')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${viewMode === 'month-grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
          <LayoutGrid size={12} /> Mese
        </button>
        <button onClick={() => setViewMode('month-list')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${viewMode === 'month-list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
          <List size={12} /> Lista
        </button>
      </div>

      {employees.length === 0 && (
        <p className="text-center text-gray-400 py-8">Aggiungi prima i dipendenti!</p>
      )}

      {/* VISTA SETTIMANA */}
      {viewMode === 'week' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr>
                <th className="text-left p-2 text-xs text-gray-500 w-20">Dipendente</th>
                {days.map(day => (
                  <th key={day.toISOString()} className="p-1 text-center w-12">
                    <p className="text-xs text-gray-500">{format(day, 'EEE', {locale: it})}</p>
                    <p className={`text-sm font-semibold ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-blue-600' : 'text-gray-800'}`}>
                      {format(day, 'd')}
                    </p>
                  </th>
                ))}
                <th className="text-center p-1 text-xs text-gray-500">Ore</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-t border-gray-100">
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: emp.color }}>
                        {emp.first_name[0]}
                      </div>
                      <span className="text-xs text-gray-700 truncate max-w-16">{emp.first_name}</span>
                    </div>
                  </td>
                  {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const shift = getShift(emp.id, dateStr)
                    return (
                      <td key={dateStr} className="p-1">
                        <button onClick={() => openCell(emp, dateStr)}
                          className={`w-full min-h-12 rounded-lg text-xs p-1 flex flex-col items-center justify-center transition-colors
                            ${shift?.is_rest_day ? 'bg-gray-100 text-gray-400' :
                              shift ? 'text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-300'}`}
                          style={shift && !shift.is_rest_day ? { backgroundColor: emp.color } : {}}>
                          {shift?.is_rest_day ? <Moon size={12} /> :
                            shift ? (<>
                              <span>{shift.start_time?.slice(0,5)}</span>
                              <span>{shift.end_time?.slice(0,5)}</span>
                              {shift.start_time_2 && <span>{shift.start_time_2?.slice(0,5)}</span>}
                              {shift.end_time_2 && <span>{shift.end_time_2?.slice(0,5)}</span>}
                            </>) :
                            <span>+</span>}
                        </button>
                      </td>
                    )
                  })}
                  <td className="p-1 text-center">
                    <span className="text-xs font-semibold text-gray-700">{calcHours(emp.id, days)}h</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VISTA MESE GRIGLIA */}
      {viewMode === 'month-grid' && (
        <div className="space-y-4">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: emp.color }}>
                  {emp.first_name[0]}
                </div>
                <span className="font-medium text-gray-800 text-sm">{emp.first_name} {emp.last_name}</span>
                <span className="ml-auto text-xs text-gray-500 font-semibold">{calcHours(emp.id, monthDays)}h</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {['L','M','M','G','V','S','D'].map((d, i) => (
                  <div key={i} className="text-center text-xs text-gray-400 py-1">{d}</div>
                ))}
                {Array.from({length: (monthStart.getDay() || 7) - 1}).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const shift = getShift(emp.id, dateStr)
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <button key={dateStr} onClick={() => openCell(emp, dateStr)}
                      className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center p-0.5
                        ${shift?.is_rest_day ? 'bg-gray-100 text-gray-400' :
                          shift ? 'text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'}
                        ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                      style={shift && !shift.is_rest_day ? { backgroundColor: emp.color } : {}}>
                      <span className="font-medium">{format(day, 'd')}</span>
                      {shift && !shift.is_rest_day && <span style={{fontSize: '8px'}}>{shift.start_time?.slice(0,5)}</span>}
                      {shift?.is_rest_day && <Moon size={8} />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA MESE LISTA */}
      {viewMode === 'month-list' && (
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: emp.color }}>
                  {emp.first_name[0]}
                </div>
                <span className="font-medium text-gray-800 text-sm">{emp.first_name} {emp.last_name}</span>
                <span className="ml-auto text-xs font-semibold text-gray-600">{calcHours(emp.id, monthDays)}h</span>
              </div>
              <div className="divide-y divide-gray-50">
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const shift = getShift(emp.id, dateStr)
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <button key={dateStr} onClick={() => openCell(emp, dateStr)}
                      className={`w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 ${isToday ? 'bg-blue-50' : ''}`}>
                      <span className={`text-xs w-8 font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {format(day, 'EEE', {locale: it})} {format(day, 'd')}
                      </span>
                      {shift ? (
                        <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${shift.is_rest_day ? 'bg-gray-100 text-gray-500' : 'text-white'}`}
                          style={!shift.is_rest_day ? { backgroundColor: emp.color } : {}}>
                          {shift.is_rest_day ? 'Riposo' : `${shift.start_time?.slice(0,5)} → ${shift.end_time?.slice(0,5)}`}
                        </span>
                      ) : (
                        <span className="ml-3 text-xs text-gray-300">— nessun turno</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal selezione turno */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedCell.employee.first_name} {selectedCell.employee.last_name}</h3>
                <p className="text-sm text-gray-500">{selectedCell.date}</p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {/* Orari predefiniti */}
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Orari predefiniti</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className="text-left px-3 py-2 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100">
                  <span className="font-medium text-gray-800 text-sm block">{t.name}</span>
                  <span className="text-xs text-gray-500">
                    {t.is_rest_day ? '😴 Riposo' : `${t.start_time} → ${t.end_time}`}
                  </span>
                </button>
              ))}
            </div>

            {/* Orario personalizzato */}
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Orario personalizzato</p>
            <div className="flex gap-2 items-end mb-2">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Inizio</p>
                <input type="time" value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Fine</p>
                <input type="time" value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 items-end mb-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Inizio 2 (opzionale)</p>
                <input type="time" value={customStart2}
                  onChange={e => setCustomStart2(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Fine 2 (opzionale)</p>
                <input type="time" value={customEnd2}
                  onChange={e => setCustomEnd2(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={applyCustomShift}
                disabled={!customStart || !customEnd}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40">
                ✓
              </button>
            </div>

            {getShift(selectedCell.employee.id, selectedCell.date) && (
              <button onClick={deleteShift}
                className="w-full px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100">
                Elimina turno
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

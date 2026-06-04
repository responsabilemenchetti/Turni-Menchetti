import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee, ShiftTemplate, Shift, AbsenceType, PublishedWeek } from '../types/index'
import { ChevronLeft, ChevronRight, X, LayoutGrid, List } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns'
import { it } from 'date-fns/locale'

type ViewMode = 'week' | 'month-grid' | 'month-list'

export function Planner({ role }: { role: 'admin' | 'viewer' }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([])
  const [publishedWeeks, setPublishedWeeks] = useState<PublishedWeek[]>([])
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

  const currentWeekStart = format(weekStart, 'yyyy-MM-dd')
  const isCurrentWeekPublished = publishedWeeks.some(w => w.week_start === currentWeekStart)

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
    const [empRes, tplRes, shiftRes, absRes, pubRes] = await Promise.all([
      supabase.from('employees').select('*').order('role').order('first_name'),
      supabase.from('shift_templates').select('*'),
      supabase.from('shifts').select('*').gte('date', dateFrom).lte('date', dateTo),
      supabase.from('absence_types').select('*').order('name'),
      supabase.from('published_weeks').select('*')
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
    setAbsenceTypes(absRes.data || [])
    setPublishedWeeks(pubRes.data || [])
    setLoading(false)
  }

  function isWeekPublished(weekStartDate: string) {
    return publishedWeeks.some(w => w.week_start === weekStartDate)
  }

  async function togglePublishWeek() {
    if (isCurrentWeekPublished) {
      await supabase.from('published_weeks').delete().eq('week_start', currentWeekStart)
    } else {
      await supabase.from('published_weeks').insert({ week_start: currentWeekStart })
    }
    loadAll()
  }

  function getShift(employeeId: string, date: string) {
    return shifts.find(s => s.employee_id === employeeId && s.date === date)
  }

  function getVisibleShift(employeeId: string, date: string, dayWeekStart: string) {
    const shift = getShift(employeeId, date)
    if (!shift) return undefined
    if (role === 'admin') return shift
    if (isWeekPublished(dayWeekStart)) return shift
    return undefined
  }

  function getAbsenceType(id?: string) {
    return absenceTypes.find(a => a.id === id)
  }

  function openCell(employee: Employee, date: string) {
    if (role !== 'admin') return
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
      is_rest_day: template.is_rest_day,
      absence_type_id: null
    }
    if (existing) {
      await supabase.from('shifts').update(data).eq('id', existing.id)
    } else {
      await supabase.from('shifts').insert(data)
    }
    setShowModal(false)
    loadAll()
  }

  async function applyAbsence(absenceType: AbsenceType) {
    if (!selectedCell) return
    const existing = getShift(selectedCell.employee.id, selectedCell.date)
    const data = {
      employee_id: selectedCell.employee.id,
      date: selectedCell.date,
      start_time: null,
      end_time: null,
      start_time_2: null,
      end_time_2: null,
      template_id: null,
      is_rest_day: true,
      absence_type_id: absenceType.id
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
      is_rest_day: false,
      absence_type_id: null
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

  function calcHours(employeeId: string, dayList: Date[], onlyPublished = false) {
    const ID_104 = 'c1ccb4b7-adb6-4819-bb3d-509c3a587bdb'
    return shifts
      .filter(s => {
        if (s.employee_id !== employeeId) return false
        const dayInList = dayList.some(d => format(d, 'yyyy-MM-dd') === s.date)
        if (!dayInList) return false
        if (onlyPublished) {
          const sw = format(startOfWeek(new Date(s.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
          if (!isWeekPublished(sw)) return false
        }
        return !s.is_rest_day || s.absence_type_id === ID_104
      })
      .reduce((acc, s) => {
        if (s.absence_type_id === ID_104) return acc + 5
        const [sh, sm] = s.start_time!.split(':').map(Number)
        const [eh, em] = s.end_time!.split(':').map(Number)
        let total = (eh * 60 + em - sh * 60 - sm) / 60
        if (s.start_time_2 && s.end_time_2) {
          const [sh2, sm2] = s.start_time_2.split(':').map(Number)
          const [eh2, em2] = s.end_time_2.split(':').map(Number)
          total += (eh2 * 60 + em2 - sh2 * 60 - sm2) / 60
        }
        return acc + total
      }, 0)
  }

  function renderRestCell(shift: Shift) {
    const absence = getAbsenceType(shift.absence_type_id)
    if (absence) return <span style={{fontSize: '16px'}}>{absence.icon}</span>
    return <span style={{fontSize: '16px'}}>🌙</span>
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

      {/* Pulsante pubblica settimana (solo admin, solo vista settimana) */}
      {role === 'admin' && viewMode === 'week' && (
        <button onClick={togglePublishWeek}
          className={`w-full py-2 rounded-xl text-sm font-medium mb-3 transition-colors ${isCurrentWeekPublished ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {isCurrentWeekPublished ? '✅ Settimana pubblicata — tocca per nascondere' : '📢 Pubblica questa settimana'}
        </button>
      )}

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
                    const shift = getVisibleShift(emp.id, dateStr, currentWeekStart)
                    const absence = shift?.absence_type_id ? getAbsenceType(shift.absence_type_id) : null
                    return (
                      <td key={dateStr} className="p-1">
                        <button onClick={() => openCell(emp, dateStr)}
                          className={`w-full min-h-12 rounded-lg text-xs p-1 flex flex-col items-center justify-center transition-colors
                            ${shift?.is_rest_day ? 'text-white' :
                              shift ? 'text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-300'}`}
                          style={shift?.is_rest_day ? { backgroundColor: absence?.color || '#6B7280' } :
                            shift ? { backgroundColor: emp.color } : {}}>
                          {shift?.is_rest_day ? renderRestCell(shift) :
                            shift ? (<>
                              <span>{shift.start_time?.slice(0,5)}</span>
                              <span>{shift.end_time?.slice(0,5)}</span>
                              {shift.start_time_2 && <span>{shift.start_time_2?.slice(0,5)}</span>}
                              {shift.end_time_2 && <span>{shift.end_time_2?.slice(0,5)}</span>}
                            </>) :
                            <span>{role === 'admin' ? '+' : ''}</span>}
                        </button>
                      </td>
                    )
                  })}
                  <td className="p-1 text-center">
                    <span className="text-xs font-semibold text-gray-700">
                      {calcHours(emp.id, days, role === 'viewer')}h
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VISTA MESE GRIGLIA */}
      {viewMode === 'month-grid' && (
        <div className="space-y-4" style={{paddingBottom: '120px'}}>
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: emp.color }}>
                  {emp.first_name[0]}
                </div>
                <span className="font-medium text-gray-800 text-sm">{emp.first_name} {emp.last_name}</span>
                <span className="ml-auto text-xs text-gray-500 font-semibold">
                  {calcHours(emp.id, monthDays, role === 'viewer')}h
                </span>
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
                  const dayWeekStart = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                  const shift = getVisibleShift(emp.id, dateStr, dayWeekStart)
                  const absence = shift?.absence_type_id ? getAbsenceType(shift.absence_type_id) : null
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <button key={dateStr} onClick={() => openCell(emp, dateStr)}
                      className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center p-0.5
                        ${shift ? 'text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'}
                        ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                      style={shift?.is_rest_day ? { backgroundColor: absence?.color || '#6B7280' } :
                        shift ? { backgroundColor: emp.color } : {}}>
                      <span className="font-medium">{format(day, 'd')}</span>
                      {shift?.is_rest_day && <span style={{fontSize: '10px'}}>{absence?.icon || '🌙'}</span>}
                      {shift && !shift.is_rest_day && <span style={{fontSize: '8px'}}>{shift.start_time?.slice(0,5)}</span>}
                      {shift && !shift.is_rest_day && <span style={{fontSize: '8px'}}>{shift.end_time?.slice(0,5)}</span>}
                      {shift && !shift.is_rest_day && shift.start_time_2 && <span style={{fontSize: '8px'}}>{'—'}</span>}
                      {shift && !shift.is_rest_day && shift.start_time_2 && <span style={{fontSize: '8px'}}>{shift.start_time_2?.slice(0,5)}</span>}
                      {shift && !shift.is_rest_day && shift.end_time_2 && <span style={{fontSize: '8px'}}>{shift.end_time_2?.slice(0,5)}</span>}
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
        <div className="space-y-2" style={{paddingBottom: '120px'}}>
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: emp.color }}>
                  {emp.first_name[0]}
                </div>
                <span className="font-medium text-gray-800 text-sm">{emp.first_name} {emp.last_name}</span>
                <span className="ml-auto text-xs font-semibold text-gray-600">
                  {calcHours(emp.id, monthDays, role === 'viewer')}h
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayWeekStart = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                  const shift = getVisibleShift(emp.id, dateStr, dayWeekStart)
                  const absence = shift?.absence_type_id ? getAbsenceType(shift.absence_type_id) : null
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <button key={dateStr} onClick={() => openCell(emp, dateStr)}
                      className={`w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 ${isToday ? 'bg-blue-50' : ''}`}>
                      <span className={`text-xs w-12 font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {format(day, 'EEE', {locale: it})} {format(day, 'd')}
                      </span>
                      {shift ? (
                        <div className="ml-3 flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ backgroundColor: shift.is_rest_day ? (absence?.color || '#6B7280') : emp.color }}>
                            {shift.is_rest_day ? `${absence?.icon || '🌙'} ${absence?.name || 'Riposo'}` : `${shift.start_time?.slice(0,5)} → ${shift.end_time?.slice(0,5)}${shift.start_time_2 ? ` | ${shift.start_time_2?.slice(0,5)} → ${shift.end_time_2?.slice(0,5)}` : ''}`}
                          </span>
                          {!shift.is_rest_day && shift.start_time && shift.end_time && (() => {
                            const [sh, sm] = shift.start_time!.split(':').map(Number)
                            const [eh, em] = shift.end_time!.split(':').map(Number)
                            let h = (eh * 60 + em - sh * 60 - sm) / 60
                            if (shift.start_time_2 && shift.end_time_2) {
                              const [sh2, sm2] = shift.start_time_2.split(':').map(Number)
                              const [eh2, em2] = shift.end_time_2.split(':').map(Number)
                              h += (eh2 * 60 + em2 - sh2 * 60 - sm2) / 60
                            }
                            return <span className="text-xs text-gray-400 font-medium">{h}h</span>
                          })()}
                        </div>
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

            {/* Tipi di assenza */}
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Assenze</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {absenceTypes.map(a => (
                <button key={a.id} onClick={() => applyAbsence(a)}
                  className="flex flex-col items-center justify-center px-2 py-3 rounded-xl border border-gray-100 hover:opacity-80"
                  style={{ backgroundColor: a.color + '22' }}>
                  <span style={{fontSize: '20px'}}>{a.icon}</span>
                  <span className="text-xs font-medium mt-1" style={{ color: a.color }}>{a.name}</span>
                </button>
              ))}
            </div>

            {/* Orari predefiniti */}
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Orari predefiniti</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {templates.filter(t => !t.is_rest_day).map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className="text-left px-3 py-2 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100">
                  <span className="font-medium text-gray-800 text-sm block">{t.name}</span>
                  <span className="text-xs text-gray-500">{t.start_time} → {t.end_time}</span>
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
            <div className="flex gap-2 mb-2">
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
            </div>
            <div className="flex gap-3">
              <button onClick={applyCustomShift}
                disabled={!customStart || !customEnd}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-40">
                Conferma orario
              </button>
              {role === 'admin' && getShift(selectedCell.employee.id, selectedCell.date) && (
                <button onClick={deleteShift}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium">
                  Elimina turno
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

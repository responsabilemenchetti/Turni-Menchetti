export interface Employee {
  id: string
  first_name: string
  last_name: string
  role: string
  color: string
  notes?: string
  created_at?: string
}

export interface ShiftTemplate {
  id: string
  name: string
  start_time?: string
  end_time?: string
  is_rest_day: boolean
  created_at?: string
}

export interface Shift {
  id: string
  employee_id: string
  date: string
  start_time?: string
  end_time?: string
  start_time_2?: string
  end_time_2?: string
  template_id?: string
  is_rest_day: boolean
  absence_type_id?: string
  notes?: string
  created_at?: string
}
export interface AbsenceType {
  id: string
  name: string
  color: string
  icon: string
  created_at?: string
}
export interface AppSettings {
  key: string
  value: string
}
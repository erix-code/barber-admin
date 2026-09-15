// Tipos alineados con los Resources de la API Laravel

export interface Role {
  id: number
  name: string
}

export interface User {
  id: number
  name: string
  last_name: string | null
  phone: string | null
  email: string
  roles: Role[]
  created_at?: string | null
  updated_at?: string | null
}

export type UserRole = 'admin' | 'owner' | 'barber' | 'client'

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'owner', label: 'Dueño' },
  { value: 'barber', label: 'Barbero' },
  { value: 'client', label: 'Cliente' },
]

export interface Barbershop {
  id: number
  name: string
  address: string
  phone: string
  opening_time: string | null
  closing_time: string | null
  owner_id: number
  created_at: string | null
  updated_at: string | null
}

export interface Schedule {
  id: number
  barber_id: number
  day_of_week: number
  start_time: string
  end_time: string
  created_at?: string | null
  updated_at?: string | null
}

export interface Barber {
  id: number
  user_id: number
  user: User | null
  barbershop_id: number
  specialties: string[] | null
  bio: string | null
  is_active: boolean
  schedules: Schedule[] | null
  created_at: string | null
  updated_at: string | null
}

export interface Service {
  id: number
  barbershop: Barbershop | null
  barbershop_id: number
  name: string
  description: string | null
  duration_minutes: number
  price: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Client {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  created_at: string | null
  updated_at: string | null
}

export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export const RESERVATION_STATUSES: ReservationStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
]

export interface Reservation {
  id: number
  status: ReservationStatus
  scheduled_at: string
  ends_at: string | null
  duration_minutes?: number
  total_price: number
  notes: string | null
  barbershop: Barbershop | null
  barber: Barber | null
  client: Client | null
  services: Service[] | null
  created_at: string | null
  updated_at: string | null
}

// Formato de paginación de Laravel
export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
    links?: { url: string | null; label: string; active: boolean }[]
  }
}

export interface LoginPayload {
  email: string
  password: string
  device_name?: string
}

export interface AuthResponse {
  user: User
  token: string
}

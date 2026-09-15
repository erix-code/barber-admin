import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Barbershop,
  Barber,
  Client,
  Paginated,
  Reservation,
  ReservationStatus,
  Service,
  User,
  UserRole,
} from '@/types/api'

const PER_PAGE = 15

// ---------- Barbershops ----------

export function useBarbershops() {
  return useQuery({
    queryKey: ['barbershops'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Barbershop>>('/barbershops', {
        params: { per_page: 100 },
      })
      return data
    },
  })
}

export function useCreateBarbershop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Barbershop>) => {
      const { data } = await api.post('/barbershops', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbershops'] }),
  })
}

export function useUpdateBarbershop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Barbershop> & { id: number }) => {
      const { data } = await api.put(`/barbershops/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbershops'] }),
  })
}

export function useDeleteBarbershop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/barbershops/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbershops'] }),
  })
}

// ---------- Barbers ----------

export function useBarbers(params?: { barbershop_id?: number }) {
  return useQuery({
    queryKey: ['barbers', params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Barber>>('/barbers', {
        params: { per_page: 100, ...params },
      })
      return data
    },
  })
}

export function useCreateBarber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/barbers', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  })
}

export function useUpdateBarber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: number }) => {
      const { data } = await api.put(`/barbers/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  })
}

export function useDeleteBarber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/barbers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  })
}

// ---------- Users ----------

export interface UserFilters {
  search?: string
  role?: UserRole
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<User>>('/users', {
        params: { per_page: 100, ...filters },
      })
      return data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/users', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: number }) => {
      const { data } = await api.put(`/users/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ---------- Services ----------

export function useServices(params?: { barbershop_id?: number }) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Service>>('/services', {
        params: { per_page: 100, ...params },
      })
      return data
    },
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/services', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: number }) => {
      const { data } = await api.put(`/services/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

// ---------- Clients ----------

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Client>>('/clients', {
        params: { per_page: 100 },
      })
      return data
    },
  })
}

// ---------- Reservations ----------

export interface ReservationFilters {
  status?: ReservationStatus
  barbershop_id?: number
  barber_id?: number
  page?: number
}

export function useReservations(filters: ReservationFilters = {}) {
  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Reservation>>('/reservations', {
        params: { per_page: PER_PAGE, ...filters },
      })
      return data
    },
  })
}

export function useUpdateReservationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ReservationStatus }) => {
      const { data } = await api.put(`/reservations/${id}`, { status })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useDeleteReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/reservations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

import axios from 'axios'

export const TOKEN_KEY = 'barber_admin_token'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 => token inválido/expirado, limpiar sesión
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('barber_admin_user')
      if (!location.pathname.startsWith('/login')) {
        location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

/** Extrae los errores de validación de Laravel {field: [msgs]} */
export function getValidationErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { errors?: Record<string, string[]> } | undefined
    if (data?.errors) {
      const out: Record<string, string> = {}
      for (const [field, messages] of Object.entries(data.errors)) {
        out[field] = messages[0]
      }
      return out
    }
  }
  return {}
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? error.message
  }
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado'
}

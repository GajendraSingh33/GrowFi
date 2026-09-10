import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://growfi.onrender.com',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('growfi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasStoredToken = Boolean(localStorage.getItem('growfi_token'))
    const isAuthRequest = /\/api\/auth\/(login|register)(?:\/|$)/.test(error.config?.url || '')
    if (error.response?.status === 401 && hasStoredToken && !isAuthRequest) {
      localStorage.removeItem('growfi_token')
      window.location.assign('/login')
    }
    const backendError = error.response?.data?.error
    error.userMessage = backendError?.message || 'Something went wrong. Please try again.'
    error.fieldErrors = backendError?.details || {}
    return Promise.reject(error)
  },
)

export default api

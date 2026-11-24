import axios from 'axios'

const sessionKey = 'minipos.session'

export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(sessionKey))
    return session?.token && session?.username ? session : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  if (session) localStorage.setItem(sessionKey, JSON.stringify(session))
  else localStorage.removeItem(sessionKey)
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getSession()?.token
  if (token && config.url !== '/auth/login') {
    config.headers.set('Authorization', 'Bearer ' + token)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      const activeToken = getSession()?.token
      const requestToken = error.config?.headers?.get('Authorization')
      if (!activeToken || requestToken === 'Bearer ' + activeToken) {
        saveSession(null)
        if (window.location.pathname !== '/login') window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  },
)

export function apiError(error) {
  return error.response?.data?.message ||
    (error.response ? 'Yêu cầu chưa thực hiện được. Vui lòng thử lại.' : 'Không kết nối được với máy chủ.')
}

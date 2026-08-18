import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '@/router'

// Create axios instance
// In dev: uses '/api' (proxied to localhost:8080 via vite.config.js)
// In production: uses VITE_API_BASE_URL env var (set in Vercel project settings)
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
})

// ===== Request interceptor: attach JWT token =====
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('blog_token')
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ===== Response interceptor: unwrap Result, handle errors =====
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // If the response is not a standard Result object, return as-is
    if (res.code === undefined) {
      return res
    }
    if (res.code === 200) {
      return res
    }
    // Business error
    message.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      if (status === 401) {
        // Token expired or not logged in -> redirect to login
        message.error(data?.message || '未登录或登录已过期，请重新登录')
        localStorage.removeItem('blog_token')
        localStorage.removeItem('blog_user')
        router.push('/login')
      } else {
        message.error(data?.message || `请求错误 (${status})`)
      }
    } else if (error.message?.includes('timeout')) {
      message.error('请求超时，请稍后重试')
    } else {
      message.error('网络异常，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export default request

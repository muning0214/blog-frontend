import { reactive, computed } from 'vue'
import { login as loginApi } from '@/api/auth'

/**
 * Simple reactive user store (no Pinia dependency).
 * Token & user info are persisted in localStorage.
 */
const state = reactive({
  token: localStorage.getItem('blog_token') || '',
  userInfo: JSON.parse(localStorage.getItem('blog_user') || 'null')
})

export function useUserStore() {
  return {
    state,
    isLogin: computed(() => !!state.token),

    async login(loginForm) {
      const res = await loginApi(loginForm)
      const data = res.data
      state.token = data.token
      state.userInfo = data.userInfo
      localStorage.setItem('blog_token', data.token)
      localStorage.setItem('blog_user', JSON.stringify(data.userInfo))
      return data
    },

    logout() {
      state.token = ''
      state.userInfo = null
      localStorage.removeItem('blog_token')
      localStorage.removeItem('blog_user')
    }
  }
}

export default { state, useUserStore }

import { computed, reactive } from 'vue'
import { fetchMe, logout as logoutApi, signIn, signUp } from '@/api/auth'
import { getToken, setToken } from '@/api/request'

/**
 * 用户状态。
 *
 * 沿用原项目的做法：不用 pinia，一个模块级的 reactive 对象就够了。
 * 登录态的唯一依据是「当前用户对象」，而不是「localStorage 里有没有令牌」——
 * 令牌可能已经过期或被吊销，只看它存在会让路由守卫误判为已登录，
 * 用户就会停在一个每个操作都失败的后台页面上。
 */
const state = reactive({
  /** 首次读取登录态是否已完成（避免首屏闪一下登录页） */
  ready: false,
  user: null,
  /** 后端不可达（没启动 / 网络不通）时为 true */
  unavailable: false,
})

let inflight = null

async function loadCurrentUser() {
  if (!getToken()) {
    state.ready = true
    return
  }
  try {
    state.user = await fetchMe()
    state.unavailable = false
  } catch (e) {
    state.user = null
    // 401 说明令牌真的失效了（拦截器已经清掉本地令牌）；
    // 其它错误只代表后端不可达，不要误导成「未登录」
    state.unavailable = e?.status !== 401
  } finally {
    state.ready = true
  }
}

export function useUserStore() {
  return {
    state,
    isLogin: computed(() => !!state.user),
    uid: computed(() => state.user?.id ?? null),

    /** 幂等：重复调用只会真正请求一次 */
    ensureLoaded() {
      if (state.ready) return Promise.resolve()
      if (!inflight) inflight = loadCurrentUser()
      return inflight
    },

    async login(credentials) {
      const data = await signIn(credentials)
      state.user = data.user
      state.unavailable = false
      state.ready = true
      inflight = Promise.resolve()
      return data
    },

    async register(payload) {
      const data = await signUp(payload)
      state.user = data.user
      state.unavailable = false
      state.ready = true
      inflight = Promise.resolve()
      return data
    },

    /** 清本地登录态。令牌失效时由 request 层回调触发。 */
    clear() {
      setToken(null)
      state.user = null
    },

    async logout() {
      await logoutApi()
      setToken(null)
      state.user = null
    },
  }
}

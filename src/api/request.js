import axios from 'axios'

/**
 * axios 封装：注入令牌、拆统一响应体、把错误归一成带 status 的 Error。
 *
 * 这里有两个刻意的设计，都是为了避开原实现里的坑：
 *
 * 1. **按 HTTP 状态码判断登录失效，不看 body 里的业务码。**
 *    如果后端把 401 包成 HTTP 200 送出来，前端基于 status 的分支就永远不会命中，
 *    表现是「令牌过期后用户卡在后台，既不跳登录也不清凭据」。后端已经改成返回真实状态码，
 *    前端这边也必须按 status 判断，两边对齐这个约定才有意义。
 *
 * 2. **不在这里自动弹提示。** 全局 message.error 会和调用方自己的提示叠成两条，
 *    也容易把「表单校验失败」这类本该内联显示的错误变成飘窗。错误一律抛给调用方处理，
 *    只有 401 例外 —— 它需要清凭据并跳登录，统一在这里做。
 */

export const TOKEN_KEY = 'devlog_token'

/** 上传目录的对外前缀，与后端 devlog.upload.public-prefix 保持一致 */
export const UPLOAD_PREFIX = '/uploads'

/** 令牌失效时的回调，由 router 挂上来（避免 request 反向依赖 router 造成循环引用） */
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 隐私模式下 localStorage 不可写，忽略：本次会话内仍可用内存状态 */
  }
}

/**
 * 把对象键解析成可访问地址。
 *
 * 数据库里存的是对象键（如 covers/ab12.png）而不是完整 URL，
 * 这样换域名或加 CDN 时不需要迁移数据。解析发生在渲染时。
 */
export function assetUrl(path) {
  if (!path) return null
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  if (path.startsWith('/')) return path
  return `${UPLOAD_PREFIX}/${path}`
}

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const body = response.data
    // 统一响应体 { code, message, data } —— 直接把 data 交给调用方
    if (body && typeof body === 'object' && 'data' in body) {
      return body.data
    }
    return body
  },
  (error) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data

    let text = body?.message
    if (!text) {
      text =
        status === 0
          ? '无法连接后端服务，请先启动 blog-backend（默认 8080 端口）'
          : `请求失败（HTTP ${status}）`
    }

    if (status === 401) {
      // 令牌过期或无效：清掉本地凭据并通知全局
      setToken(null)
      unauthorizedHandler?.()
    }

    const wrapped = new Error(text)
    wrapped.status = status
    wrapped.code = body?.code
    return Promise.reject(wrapped)
  },
)

export default request

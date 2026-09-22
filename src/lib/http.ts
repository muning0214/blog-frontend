/**
 * HTTP 客户端：统一的请求封装、令牌注入、错误归一。
 *
 * ============================================================================
 * 这里是对原 test1 项目那个 401 死角的直接修复
 * ============================================================================
 * test1 的症状：后端异常处理器返回的是响应对象而不是 ResponseEntity，
 * 于是「未登录」以 HTTP 200 + body {code:401} 发出；前端却按
 * `error.response.status === 401` 判断，那个分支永远不成立。
 * 结果是令牌过期后用户卡在后台，既不跳登录也不清凭据，只看到一堆 toast。
 *
 * 本项目的做法：
 *   - 后端用 ResponseEntity 返回真实状态码（见 GlobalExceptionHandler）
 *   - 前端一律按 res.status 判断，不看 body 里的业务码
 *   - 401 时清令牌并触发全局回调，由 AuthProvider 把状态置为未登录，
 *     路由守卫随即把用户送回登录页
 * ============================================================================
 */

/** 相对路径走 Vite 代理（开发）或同源反向代理（生产），也可由环境变量指定绝对地址 */
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api').replace(/\/+$/, '')

/** 上传目录对外前缀，与后端 devlog.upload.public-prefix 保持一致 */
export const UPLOAD_PREFIX = '/uploads'

const TOKEN_KEY = 'devlog_token'

export class ApiError extends Error {
  readonly status: number
  readonly code?: number

  constructor(message: string, status: number, code?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 隐私模式下 localStorage 不可写，忽略：本次会话内仍可用内存状态 */
  }
}

/**
 * 把对象键解析成可访问的地址。
 *
 * 数据库里存的是对象键（如 covers/ab12.png），不是完整 URL ——
 * 这样换域名或加 CDN 时不需要迁移数据。解析发生在这里。
 */
export function assetUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  if (path.startsWith('/')) return path
  return `${UPLOAD_PREFIX}/${path}`
}

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** AuthProvider 挂上来：令牌失效时由它清理登录态 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export type QueryValue = string | number | boolean | null | undefined

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  formData?: FormData
  signal?: AbortSignal
}

function buildQuery(query?: Record<string, QueryValue>) {
  if (!query) return ''
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    params.append(key, String(value))
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * 发起请求并拆掉统一响应体 {code, message, data}，直接返回 data。
 * 失败一律抛 ApiError，调用方只需要 try/catch 一种写法。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = API_BASE + path + buildQuery(options.query)
  const headers: Record<string, string> = {}

  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.formData) {
    // 交给浏览器自己带 boundary，不要手工设 Content-Type
    body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    throw new ApiError('无法连接后端服务，请确认它已经启动', 0)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: any = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (response.status === 401) {
    // 令牌过期或无效：清掉本地凭据并通知全局
    setToken(null)
    unauthorizedHandler?.()
    throw new ApiError(payload?.message || '登录已过期，请重新登录', 401)
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `请求失败（HTTP ${response.status}）`,
      response.status,
      payload?.code,
    )
  }

  // 统一响应体：{ code, message, data }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T
  }
  return payload as T
}

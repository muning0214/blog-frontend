import request, { setToken } from './request'

/** 登录：邮箱 + 密码 */
export function login(payload) {
  return request.post('/auth/login', payload)
}

/** 注册，成功即返回令牌 */
export function register(payload) {
  return request.post('/auth/register', payload)
}

/** 当前登录用户（需要令牌） */
export function fetchMe() {
  return request.get('/auth/me')
}

/**
 * 修改密码。
 *
 * 注意请求体用的是 snake_case：后端开启了 Jackson 的 SNAKE_CASE 命名策略，
 * **反序列化同样按 snake_case 匹配**，传驼峰会被当成「这个字段没传」而静默丢弃，
 * 表现为「明明填了新密码却报『请输入新密码』」。
 * 这里做一层映射，让调用方仍然可以用驼峰命名。
 */
export function changePassword({ oldPassword, newPassword }) {
  return request.put('/auth/password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

/**
 * 登出。
 * 令牌是无状态的 JWT，服务端没有会话可销毁，所以这里只负责丢本地凭据；
 * 调用接口是为了让「登出」有个明确的审计点，失败也不影响本地清理。
 */
export function logout() {
  return request.post('/auth/logout').catch(() => null)
}

/** 登录成功后统一落地令牌 */
export async function signIn(credentials) {
  const data = await login(credentials)
  setToken(data.token)
  return data
}

export async function signUp(payload) {
  const data = await register(payload)
  setToken(data.token)
  return data
}

/* ------------------------------------------------------------------ */
/* GitHub 登录                                                        */
/* ------------------------------------------------------------------ */

/**
 * 后端是否配置了 GitHub 登录。
 * 失败（含后端没起）一律当「不可用」处理，前端就不会渲染一个点了报错的按钮。
 */
export function fetchGithubEnabled() {
  return request.get('/auth/github/enabled').catch(() => false)
}

/** 发起登录，返回 { authorizeUrl, state } */
export function fetchGithubAuthorizeUrl() {
  return request.post('/auth/github/authorize')
}

/** 登录回调：用 code + state 换取本服务的令牌 */
export async function signInWithGithub(code, state) {
  const data = await request.post('/auth/github/callback', { code, state })
  setToken(data.token)
  return data
}

/** 当前账号已绑定的登录方式（需登录） */
export function fetchIdentities() {
  return request.get('/auth/identities').catch(() => [])
}

/** 发起绑定，返回 { authorizeUrl, state }（需登录） */
export function fetchGithubBindUrl() {
  return request.post('/auth/github/bind-authorize')
}

export function bindGithub(code, state) {
  return request.post('/auth/github/bind', { code, state })
}

export function unbindGithub() {
  return request.delete('/auth/github/bind')
}

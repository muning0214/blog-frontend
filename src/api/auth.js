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

/** 修改密码（需要旧密码） */
export function changePassword(payload) {
  return request.put('/auth/password', payload)
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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, getToken, request, setToken, setUnauthorizedHandler } from './http'

export type AuthUser = {
  id: number
  email: string
  nickname: string
  role: string
  avatar_path?: string | null
  bio?: string | null
}

type LoginResponse = { token: string; user: AuthUser }

export type AuthState = {
  ready: boolean
  user: AuthUser | null
  /** 数字型的用户 id，与 articles.user_id 类型一致，可以直接比较 */
  uid: number | null
  /** 后端不可达（没启动 / 网络不通）时为 true */
  unavailable: boolean
}

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setReady(true)
      return
    }
    try {
      const me = await request<AuthUser>('/auth/me')
      setUser(me)
      setUnavailable(false)
    } catch (e) {
      setUser(null)
      // 401 表示令牌真的失效了（http 层已经清掉令牌）；
      // 其它错误（后端没起、网络断了）只提示不可达，不要误导成「未登录」
      setUnavailable(!(e instanceof ApiError && e.status === 401))
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    // 令牌过期由 http 层统一回调，这里只负责把登录态清干净
    setUnauthorizedHandler(() => setUser(null))
    void refresh()
    return () => setUnauthorizedHandler(null)
  }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await request<void>('/auth/logout', { method: 'POST' })
    } catch {
      // 登出接口失败也要把本地状态清掉
    }
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      uid: user?.id ?? null,
      unavailable,
      refresh,
      signOut,
    }),
    [ready, user, unavailable, refresh, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内部使用')
  return ctx
}

/* ------------------------------------------------------------------ */
/* 认证操作                                                            */
/* ------------------------------------------------------------------ */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string }

function fail(e: unknown): { ok: false; message: string } {
  if (e instanceof ApiError) {
    if (e.status === 0) {
      return { ok: false, message: '无法连接后端服务，请先启动 blog-backend（默认 8080 端口）' }
    }
    return { ok: false, message: e.message }
  }
  return { ok: false, message: '操作失败，请稍后重试' }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<ActionResult<LoginResponse>> {
  try {
    const data = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token)
    return { ok: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function registerAccount(
  email: string,
  password: string,
  nickname?: string,
): Promise<ActionResult<LoginResponse>> {
  try {
    const data = await request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, nickname },
    })
    setToken(data.token)
    return { ok: true, data }
  } catch (e) {
    return fail(e)
  }
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<ActionResult<void>> {
  try {
    await request<void>('/auth/password', { method: 'PUT', body: { oldPassword, newPassword } })
    return { ok: true, data: undefined }
  } catch (e) {
    return fail(e)
  }
}

import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { EmptyState, PageLoading, Notice } from './ui'
import { IconUser } from './icons'

/**
 * 需要登录才能进入的页面外壳。
 * 认证只在应用正式发布域名下可用，因此这里也把「当前地址不可用」讲清楚，
 * 避免在本地预览时留下一个永远转圈的登录墙。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user, unavailable } = useAuth()
  const location = useLocation()

  if (!ready) return <PageLoading label="正在确认登录状态…" />

  if (!user) {
    return (
      <div className="container section">
        {unavailable ? (
          <Notice tone="error">
            当前地址无法与云服务的认证接口通信。请通过应用发布后的正式链接访问工作台。
          </Notice>
        ) : null}
        <EmptyState
          icon={<IconUser width={24} height={24} />}
          title="这一页需要作者登录"
          description="工作台用于写作与管理，浏览文章不需要账号。"
          action={
            <Link className="btn btn--primary" to="/login" state={{ from: location.pathname + location.search }}>
              去登录
            </Link>
          }
        />
      </div>
    )
  }

  return <>{children}</>
}

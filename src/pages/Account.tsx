import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { changePassword, useAuth } from '../lib/auth'
import { fetchMyArticles } from '../lib/api'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import { formatCount, formatDate } from '../lib/utils'
import { RequireAuth } from '../components/RequireAuth'
import { Field, Notice, PageLoading, Spinner } from '../components/ui'
import { IconLogout, IconSettings, IconUser } from '../components/icons'

function AccountInner() {
  const { user, uid, signOut } = useAuth()
  const { site } = useSiteSettings()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [counts, setCounts] = useState<{ total: number; views: number } | null>(null)

  useDocumentTitle(`账号 · ${site.site_name}`)

  useEffect(() => {
    if (!uid) return
    fetchMyArticles(uid)
      .then((rows) =>
        setCounts({
          total: rows.length,
          views: rows.reduce((s, a) => s + (a.views ?? 0), 0),
        }),
      )
      .catch(() => setCounts(null))
  }, [uid])

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setOk(null)
      if (!oldPassword) return setError('请输入当前密码')
      if (newPassword.length < 8) return setError('新密码至少 8 位')
      if (newPassword !== confirm) return setError('两次输入的新密码不一致')
      if (newPassword === oldPassword) return setError('新密码不能与当前密码相同')

      setBusy(true)
      const res = await changePassword(oldPassword, newPassword)
      setBusy(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
      setOk('密码已更新。其它设备上的会话不会自动失效，如需强制下线可在数据库侧清理会话。')
    },
    [oldPassword, newPassword, confirm],
  )

  return (
    <div className="container section account-page">
      <header className="page-head">
        <h1 className="page-head__title">
          <IconUser width={20} height={20} />
          账号
        </h1>
        <p className="page-head__sub">登录身份由云端认证服务签发，前端只持有短期访问令牌。</p>
      </header>

      <div className="account-grid">
        <section className="side-panel">
          <h3 className="side-panel__title">
            <IconUser width={15} height={15} />
            当前身份
          </h3>
          <dl className="kv">
            <div>
              <dt>昵称</dt>
              <dd>{user?.nickname || '—'}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>{user?.email || '—'}</dd>
            </div>
            <div>
              <dt>用户 ID</dt>
              <dd>
                <code>{uid}</code>
              </dd>
            </div>
            <div>
              <dt>我的文章</dt>
              <dd>{counts ? `${counts.total} 篇` : '…'}</dd>
            </div>
            <div>
              <dt>累计阅读</dt>
              <dd>{counts ? formatCount(counts.views) : '…'}</dd>
            </div>
          </dl>
          <div className="panel-form__actions">
            <Link className="btn btn--ghost" to="/dashboard">
              <IconSettings width={15} height={15} />
              去工作台
            </Link>
            <button type="button" className="btn btn--danger-ghost" onClick={() => void signOut()}>
              <IconLogout width={15} height={15} />
              退出登录
            </button>
          </div>
        </section>

        <section className="side-panel">
          <h3 className="side-panel__title">修改密码</h3>
          <form className="panel-form" onSubmit={submit}>
            {error ? <Notice tone="error">{error}</Notice> : null}
            {ok ? <Notice tone="ok">{ok}</Notice> : null}
            <Field label="当前密码" required>
              <input
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="新密码" required hint="至少 8 位">
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="确认新密码" required>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? <Spinner /> : null}
              更新密码
            </button>
            <p className="field__hint">
              忘记当前密码时，可以在<Link to="/login">登录页</Link>走「忘记密码」流程，用邮箱验证码重置。
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}

export function AccountPage() {
  return (
    <RequireAuth>
      <AccountInner />
    </RequireAuth>
  )
}

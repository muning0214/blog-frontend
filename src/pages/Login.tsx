import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { registerAccount, signInWithPassword, useAuth } from '../lib/auth'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import { cn } from '../lib/utils'
import { Field, Notice, Spinner } from '../components/ui'
import { IconCheck, IconSparkle, IconWarning } from '../components/icons'

type Tab = 'login' | 'register'

const TABS: { key: Tab; label: string }[] = [
  { key: 'login', label: '密码登录' },
  { key: 'register', label: '注册账号' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 登录页。
 *
 * 相比云端版本少了两个入口：邮箱验证码登录与忘记密码。
 * 原因很直接 —— 这两件事都需要发邮件，而自建后端没接邮件服务。
 * 界面上留一个发不出信的按钮，比暂时没有这个入口更糟。
 * 密码找回走服务端运维手段，或等接入邮件服务后再补。
 */
export function LoginPage() {
  const { site } = useSiteSettings()
  const { ready, user, unavailable, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useDocumentTitle(`登录 · ${site.site_name}`)

  const redirectTo = useMemo(() => {
    const from = (location.state as any)?.from
    return typeof from === 'string' ? from : '/dashboard'
  }, [location.state])

  useEffect(() => {
    if (ready && user) navigate(redirectTo, { replace: true })
  }, [ready, user, navigate, redirectTo])

  const switchTab = (next: Tab) => {
    setTab(next)
    setPassword('')
    setConfirm('')
    setNickname('')
    setError(null)
    setNotice(null)
  }

  const submitLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    setNotice(null)
    if (!EMAIL_RE.test(email)) return setError('请输入有效的邮箱地址')
    if (!password) return setError('请输入密码')

    setBusy(true)
    const res = await signInWithPassword(email.trim(), password)
    setBusy(false)
    if (!res.ok) return setError(res.message)
    await refresh()
    navigate(redirectTo, { replace: true })
  }

  const submitRegister = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    setNotice(null)
    if (!EMAIL_RE.test(email)) return setError('请输入有效的邮箱地址')
    if (password.length < 8) return setError('密码至少 8 位')
    if (password.length > 72) return setError('密码不能超过 72 位')
    if (password !== confirm) return setError('两次输入的密码不一致')

    setBusy(true)
    const res = await registerAccount(email.trim(), password, nickname.trim() || undefined)
    setBusy(false)
    if (!res.ok) return setError(res.message)
    setNotice('注册成功，已自动登录。')
    await refresh()
    navigate('/dashboard', { replace: true })
  }

  if (!ready) {
    return (
      <div className="container section">
        <div className="login-card login-card--loading">
          <Spinner label="正在检查登录状态…" />
        </div>
      </div>
    )
  }

  return (
    <div className="container section login-page">
      <div className="login-card">
        <div className="login-card__head">
          <span className="hero__eyebrow">
            <IconSparkle width={14} height={14} />
            作者入口
          </span>
          <h1>登录 {site.site_name}</h1>
          <p className="login-card__sub">
            登录后可以写作、上传图片与附件、管理标签和站点信息。访客浏览文章不需要登录。
          </p>
        </div>

        {unavailable ? (
          <Notice tone="error">
            <strong>连不上后端服务。</strong>
            这个前端需要 blog-backend 跑在 <code>http://localhost:8080</code>。
            在 <code>blog-backend</code> 目录下执行 <code>mvn spring-boot:run</code>，然后刷新本页。
          </Notice>
        ) : null}

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={cn('tabs__item', tab === t.key && 'is-active')}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {notice ? <Notice tone="ok">{notice}</Notice> : null}

        {tab === 'login' ? (
          <form className="login-form" onSubmit={submitLogin}>
            <Field label="邮箱" required>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@devlog.local"
              />
            </Field>
            <Field label="密码" required>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? <Spinner /> : '登录'}
            </button>
          </form>
        ) : null}

        {tab === 'register' ? (
          <form className="login-form" onSubmit={submitRegister}>
            <Field label="邮箱" required hint="用于登录，不会对外展示">
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="昵称" hint="留空则取邮箱 @ 前面的部分">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="显示名"
                maxLength={60}
              />
            </Field>
            <Field label="密码" required hint="8 到 72 位。上限来自 BCrypt 的算法限制。">
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
              />
            </Field>
            <Field label="确认密码" required>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再输一次"
              />
            </Field>
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? <Spinner /> : '注册并登录'}
            </button>
          </form>
        ) : null}

        <div className="login-card__foot">
          <span className="login-card__note">
            <IconCheck width={13} height={13} />
            登录态存在浏览器本地，令牌过期会自动跳回本页
          </span>
          <Link className="link-inline" to="/">
            先去逛逛文章
          </Link>
        </div>
      </div>

      <aside className="login-aside">
        <h2>这个站点怎么搭的</h2>
        <p>三个模块各自独立，前端不碰数据库，后端不管界面：</p>
        <ul>
          <li>
            <strong>blog-frontend</strong> —— React 19 + TypeScript + Vite
          </li>
          <li>
            <strong>blog-backend</strong> —— Spring Boot 3.2 + MyBatis-Plus，负责鉴权、校验与文件存储
          </li>
          <li>
            <strong>blog-database</strong> —— MySQL 8 的表结构与初始数据
          </li>
        </ul>
        <p>
          初始账号是 <code>admin@devlog.local</code>，密码 <code>admin123</code>，
          由 <code>blog-database/02_seed.sql</code> 灌入。
        </p>
        <p className="login-aside__note">
          <IconWarning width={14} height={14} />
          这个默认密码只是为了让本地第一次就能登进来，换成真实环境请立刻改掉。
        </p>
      </aside>
    </div>
  )
}

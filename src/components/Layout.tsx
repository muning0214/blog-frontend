import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useObjectUrl, useSiteSettings } from '../lib/hooks'
import { cn } from '../lib/utils'
import {
  IconClose,
  IconGithub,
  IconLogout,
  IconMail,
  IconMenu,
  IconSearch,
  IconSettings,
  IconSparkle,
  IconUser,
} from './icons'
import { BackToTop, ThemeToggle } from './ui'

const NAV = [
  { to: '/', label: '首页', end: true },
  { to: '/articles', label: '文章', end: false },
  { to: '/tags', label: '标签', end: false },
  { to: '/about', label: '关于', end: false },
]

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function UserMenu() {
  const { ready, user, uid, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const avatar = useObjectUrl(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!ready) {
    return <span className="skeleton skeleton--pill" aria-hidden="true" />
  }

  if (!user) {
    return (
      <Link className="btn btn--primary btn--sm" to="/login">
        登录
      </Link>
    )
  }

  const initial = (user.nickname || user.email || 'U').trim().slice(0, 1).toUpperCase()

  return (
    <div className="user-menu" ref={boxRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar">
          {avatar ? <img src={avatar} alt="" /> : <span>{initial}</span>}
        </span>
      </button>

      {open ? (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__head">
            <div className="user-menu__name">{user.nickname || '已登录'}</div>
            {user.email ? <div className="user-menu__mail">{user.email}</div> : null}
          </div>
          <button
            type="button"
            className="user-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/dashboard')
            }}
          >
            <IconSparkle width={15} height={15} />
            写作工作台
          </button>
          <button
            type="button"
            className="user-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/account')
            }}
          >
            <IconSettings width={15} height={15} />
            账号与密码
          </button>
          <div className="user-menu__sep" />
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
          >
            <IconLogout width={15} height={15} />
            退出登录
          </button>
          <div className="user-menu__foot">uid · {uid ?? '-'}</div>
        </div>
      ) : null}
    </div>
  )
}

function HeaderSearch() {
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!location.pathname.startsWith('/articles')) setValue('')
  }, [location.pathname])

  return (
    <form
      className="header-search"
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        navigate(q ? `/articles?q=${encodeURIComponent(q)}` : '/articles')
      }}
      role="search"
    >
      <IconSearch width={15} height={15} />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索文章…"
        aria-label="搜索文章"
      />
    </form>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { site } = useSiteSettings()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setDrawer(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  return (
    <div className="app-shell">
      <ScrollToTop />

      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="brand" to="/" aria-label={`${site.site_name} 首页`}>
            <span className="brand__mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 8l-3 4 3 4M15 8l3 4-3 4M13 5.5l-2 13" />
              </svg>
            </span>
            <span className="brand__text">
              <span className="brand__name">{site.site_name}</span>
              <span className="brand__tag">{site.tagline}</span>
            </span>
          </Link>

          <nav className="site-nav" aria-label="主导航">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => cn('site-nav__link', isActive && 'is-active')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-header__side">
            <HeaderSearch />
            <ThemeToggle />
            <UserMenu />
            <button
              type="button"
              className="icon-btn icon-btn--menu"
              onClick={() => setDrawer(true)}
              aria-label="打开菜单"
            >
              <IconMenu width={18} height={18} />
            </button>
          </div>
        </div>
      </header>

      {drawer ? (
        <div className="drawer">
          <div className="drawer__mask" onClick={() => setDrawer(false)} />
          <aside className="drawer__panel">
            <div className="drawer__head">
              <span className="brand__name">{site.site_name}</span>
              <button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label="关闭菜单">
                <IconClose width={18} height={18} />
              </button>
            </div>
            <nav className="drawer__nav">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => cn('drawer__link', isActive && 'is-active')}
                >
                  {n.label}
                </NavLink>
              ))}
              <NavLink to="/dashboard" className={({ isActive }) => cn('drawer__link', isActive && 'is-active')}>
                工作台
              </NavLink>
            </nav>
            <div className="drawer__foot">
              <HeaderSearch />
            </div>
          </aside>
        </div>
      ) : null}

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <div className="brand__name">{site.site_name}</div>
            <p className="site-footer__tag">{site.tagline}</p>
            <p className="site-footer__note">
              文章存于云端数据库，图片与附件存于云端对象存储，按行级安全策略隔离权限。
            </p>
          </div>

          <div className="site-footer__col">
            <h4>导航</h4>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}>
                {n.label}
              </Link>
            ))}
          </div>

          <div className="site-footer__col">
            <h4>联系</h4>
            {site.email ? (
              <a href={`mailto:${site.email}`}>
                <IconMail width={14} height={14} />
                {site.email}
              </a>
            ) : null}
            {site.github ? (
              <a href={site.github} target="_blank" rel="noopener noreferrer">
                <IconGithub width={14} height={14} />
                GitHub
              </a>
            ) : null}
            <Link to="/login">
              <IconUser width={14} height={14} />
              作者登录
            </Link>
          </div>
        </div>

        <div className="container site-footer__bottom">
          <span>
            © {new Date().getFullYear()} {site.site_name}
          </span>
          <span className="site-footer__stack">React · PostgREST · 云端对象存储</span>
        </div>
      </footer>

      <BackToTop />
    </div>
  )
}

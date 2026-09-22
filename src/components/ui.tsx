import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  IconArrowLeft,
  IconArrowRight,
  IconClose,
  IconMoon,
  IconSun,
  IconWarning,
} from './icons'
import { useTheme } from '../lib/hooks'
import { cn } from '../lib/utils'

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-wrap">
      <span className="spinner" aria-hidden="true" />
      {label ? <span className="spinner-label">{label}</span> : null}
    </span>
  )
}

export function PageLoading({ label = '正在从云端读取…' }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <Spinner label={label} />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="state-block state-block--empty">
      {icon ? <div className="state-block__icon">{icon}</div> : null}
      <h3 className="state-block__title">{title}</h3>
      {description ? <p className="state-block__desc">{description}</p> : null}
      {action ? <div className="state-block__action">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block state-block--error" role="alert">
      <div className="state-block__icon state-block__icon--warn">
        <IconWarning width={22} height={22} />
      </div>
      <h3 className="state-block__title">没能取到数据</h3>
      <p className="state-block__desc">{message}</p>
      {onRetry ? (
        <div className="state-block__action">
          <button type="button" className="btn btn--ghost" onClick={onRetry}>
            重新加载
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function TagPill({
  slug,
  name,
  color,
  count,
  size = 'md',
}: {
  slug: string
  name?: string
  color?: string | null
  count?: number
  size?: 'sm' | 'md'
}) {
  return (
    <Link
      className={cn('tag-pill', size === 'sm' && 'tag-pill--sm')}
      to={`/articles?tag=${encodeURIComponent(slug)}`}
      style={color ? ({ '--tag-color': color } as React.CSSProperties) : undefined}
    >
      <span className="tag-pill__dot" />
      <span className="tag-pill__name">{name ?? slug}</span>
      {typeof count === 'number' ? <span className="tag-pill__count">{count}</span> : null}
    </Link>
  )
}

export function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  return (
    <span className={cn('badge', status === 'published' ? 'badge--ok' : 'badge--draft')}>
      {status === 'published' ? '已发布' : '草稿'}
    </span>
  )
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (next: number) => void
}) {
  if (totalPages <= 1) return null

  const windowed: number[] = []
  const from = Math.max(1, Math.min(page - 1, totalPages - 2))
  const to = Math.min(totalPages, from + 2)
  for (let i = from; i <= to; i++) windowed.push(i)

  return (
    <nav className="pagination" aria-label="分页">
      <button
        type="button"
        className="pagination__nav"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="上一页"
      >
        <IconArrowLeft width={15} height={15} />
      </button>
      {from > 1 ? (
        <>
          <button type="button" className="pagination__page" onClick={() => onChange(1)}>
            1
          </button>
          {from > 2 ? <span className="pagination__gap">···</span> : null}
        </>
      ) : null}
      {windowed.map((n) => (
        <button
          key={n}
          type="button"
          className={cn('pagination__page', n === page && 'is-active')}
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
        >
          {n}
        </button>
      ))}
      {to < totalPages ? (
        <>
          {to < totalPages - 1 ? <span className="pagination__gap">···</span> : null}
          <button
            type="button"
            className="pagination__page"
            onClick={() => onChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="pagination__nav"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="下一页"
      >
        <IconArrowRight width={15} height={15} />
      </button>
    </nav>
  )
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {theme === 'dark' ? <IconSun width={17} height={17} /> : <IconMoon width={17} height={17} />}
    </button>
  )
}

export function Notice({
  tone = 'info',
  children,
  onClose,
}: {
  tone?: 'info' | 'error' | 'ok'
  children: ReactNode
  onClose?: () => void
}) {
  return (
    <div className={cn('notice', `notice--${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="notice__body">{children}</div>
      {onClose ? (
        <button type="button" className="notice__close" onClick={onClose} aria-label="关闭">
          <IconClose width={14} height={14} />
        </button>
      ) : null}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  tone = 'danger',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__mask" onClick={() => (!busy ? onCancel() : undefined)} />
      <div className="modal__panel">
        <h3 className="modal__title">{title}</h3>
        <div className="modal__body">{message}</div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className={cn('btn', tone === 'danger' ? 'btn--danger' : 'btn--primary')}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Spinner /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required ? <em className="field__req">*</em> : null}
      </span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      type="button"
      className="to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="回到顶部"
    >
      <IconArrowRight width={16} height={16} style={{ transform: 'rotate(-90deg)' }} />
    </button>
  )
}

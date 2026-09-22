import { Link } from 'react-router-dom'
import type { Article } from '../lib/types'
import { useObjectUrl } from '../lib/hooks'
import { cn, coverGradient, formatCount, formatDateShort, relativeTime } from '../lib/utils'
import { IconClock, IconEye } from './icons'
import { TagPill } from './ui'

/** 封面：存的是对象键，展示时才换签名地址；拿不到就退化成渐变色块 */
export function CoverImage({
  path,
  seed,
  alt,
  className,
}: {
  path?: string | null
  seed: string
  alt: string
  className?: string
}) {
  const url = useObjectUrl(path)
  const gradient = coverGradient(seed)

  if (url) {
    return <img className={cn('cover-img', className)} src={url} alt={alt} loading="lazy" />
  }

  const glyph = alt.trim().slice(0, 1) || '#'
  return (
    <div className={cn('cover-fallback', className)} style={{ backgroundImage: gradient }} aria-hidden="true">
      <span className="cover-fallback__glyph">{glyph}</span>
      <span className="cover-fallback__grid" />
    </div>
  )
}

export function ArticleCard({ article, variant = 'default' }: { article: Article; variant?: 'default' | 'wide' }) {
  return (
    <article className={cn('card', variant === 'wide' && 'card--wide')}>
      <Link className="card__cover" to={`/article/${encodeURIComponent(article.slug)}`} tabIndex={-1}>
        <CoverImage path={article.cover_path} seed={article.slug} alt={article.title} />
      </Link>

      <div className="card__body">
        <div className="card__tags">
          {(article.tags ?? []).slice(0, 3).map((t) => (
            <TagPill key={t} slug={t} size="sm" />
          ))}
        </div>

        <h3 className="card__title">
          <Link to={`/article/${encodeURIComponent(article.slug)}`}>{article.title}</Link>
        </h3>

        {article.summary ? <p className="card__summary">{article.summary}</p> : null}

        <div className="card__meta">
          <span className="card__meta-item" title={article.published_at ?? article.created_at}>
            {formatDateShort(article.published_at ?? article.created_at)}
          </span>
          <span className="card__meta-item">
            <IconClock width={13} height={13} />
            {article.reading_minutes} 分钟
          </span>
          <span className="card__meta-item">
            <IconEye width={13} height={13} />
            {formatCount(article.views)}
          </span>
        </div>
      </div>
    </article>
  )
}

/** 工作台用的紧凑行式条目 */
export function ArticleRow({
  article,
  onDelete,
}: {
  article: Article
  onDelete?: (a: Article) => void
}) {
  return (
    <div className="row-item">
      <div className="row-item__thumb">
        <CoverImage path={article.cover_path} seed={article.slug} alt={article.title} />
      </div>
      <div className="row-item__main">
        <div className="row-item__top">
          <Link className="row-item__title" to={`/article/${encodeURIComponent(article.slug)}`}>
            {article.title}
          </Link>
          <span className={cn('badge', article.status === 'published' ? 'badge--ok' : 'badge--draft')}>
            {article.status === 'published' ? '已发布' : '草稿'}
          </span>
          {article.featured ? <span className="badge badge--star">精选</span> : null}
        </div>
        <div className="row-item__meta">
          <span>{relativeTime(article.updated_at)} 更新</span>
          <span>·</span>
          <span>{formatCount(article.views)} 阅读</span>
          <span>·</span>
          <span>{(article.tags ?? []).join(' / ') || '无标签'}</span>
        </div>
      </div>
      <div className="row-item__actions">
        <Link className="btn btn--sm btn--ghost" to={`/write/${article.id}`}>
          编辑
        </Link>
        <Link
          className="btn btn--sm btn--ghost"
          to={`/article/${encodeURIComponent(article.slug)}`}
        >
          查看
        </Link>
        {onDelete ? (
          <button type="button" className="btn btn--sm btn--danger-ghost" onClick={() => onDelete(article)}>
            删除
          </button>
        ) : null}
      </div>
    </div>
  )
}

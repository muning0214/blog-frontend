import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createTag,
  deleteArticle,
  deleteTag,
  fetchMyArticles,
  fetchPublishedArticles,
  fetchSettings,
  fetchTagCounts,
  fetchTags,
  saveSettings,
  updateTag,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import type { Article, SiteSettings, Tag } from '../lib/types'
import { cn, formatCount, relativeTime } from '../lib/utils'
import { ArticleRow } from '../components/ArticleCard'
import { RequireAuth } from '../components/RequireAuth'
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Notice,
  PageLoading,
  Spinner,
} from '../components/ui'
import {
  IconChart,
  IconEdit,
  IconEye,
  IconPlus,
  IconSettings,
  IconSparkle,
  IconTag,
  IconTrash,
} from '../components/icons'

type Tab = 'articles' | 'settings' | 'tags'

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {hint ? <span className="stat-card__hint">{hint}</span> : null}
    </div>
  )
}

function SettingsForm({ uid }: { uid: number }) {
  const { reload } = useSiteSettings()
  const [current, setCurrent] = useState<SiteSettings | null>(null)
  const [form, setForm] = useState({
    site_name: '',
    tagline: '',
    author_name: '',
    author_bio: '',
    about_md: '',
    email: '',
    github: '',
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchSettings()
      .then((s) => {
        if (!alive) return
        setCurrent(s)
        if (s) {
          setForm({
            site_name: s.site_name ?? '',
            tagline: s.tagline ?? '',
            author_name: s.author_name ?? '',
            author_bio: s.author_bio ?? '',
            about_md: s.about_md ?? '',
            email: s.email ?? '',
            github: s.github ?? '',
          })
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const saved = await saveSettings(form, current, uid)
      setCurrent(saved)
      await reload()
      setOk('站点信息已保存，页头、页脚与关于页会立即生效。')
    } catch (err: any) {
      setError(err?.message ?? '保存失败')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoading label="正在读取站点配置…" />

  const ownedByOther = Boolean(current && current.user_id !== uid)

  return (
    <form className="panel-form" onSubmit={save}>
      {ownedByOther ? (
        <Notice tone="error">
          当前站点配置由另一个账号创建，无法覆盖。请用原账号登录编辑，或在数据库里清掉该项目重新保存。
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {ok ? <Notice tone="ok">{ok}</Notice> : null}

      <div className="form-grid">
        <Field label="站点名称" required>
          <input
            value={form.site_name}
            onChange={(e) => setForm({ ...form, site_name: e.target.value })}
            placeholder="DevLog"
            maxLength={40}
          />
        </Field>
        <Field label="副标题 / 一句话简介">
          <input
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="写代码，也写下为什么这样写"
            maxLength={80}
          />
        </Field>
        <Field label="作者名">
          <input
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
            maxLength={40}
          />
        </Field>
        <Field label="联系邮箱">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="GitHub 地址">
          <input
            value={form.github}
            onChange={(e) => setForm({ ...form, github: e.target.value })}
            placeholder="https://github.com/yourname"
          />
        </Field>
      </div>

      <Field label="作者简介" hint="显示在关于页顶部与文章末的作者卡片里">
        <textarea
          rows={3}
          value={form.author_bio}
          onChange={(e) => setForm({ ...form, author_bio: e.target.value })}
          maxLength={300}
        />
      </Field>

      <Field label="关于页正文（Markdown）" hint="支持标题、表格、代码块；留空则使用内置默认内容">
        <textarea
          className="code-textarea"
          rows={16}
          value={form.about_md}
          onChange={(e) => setForm({ ...form, about_md: e.target.value })}
        />
      </Field>

      <div className="panel-form__actions">
        <button type="submit" className="btn btn--primary" disabled={busy || ownedByOther}>
          {busy ? <Spinner /> : null}
          保存站点信息
        </button>
        <Link className="btn btn--ghost" to="/about">
          预览关于页
        </Link>
      </div>
    </form>
  )
}

function TagManager({ uid }: { uid: number }) {
  const [tags, setTags] = useState<Tag[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ name: '', slug: '', description: '', color: '#6366f1' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 计数由后端聚合，不再把整站文章拉下来在前端数
      const [t, counts] = await Promise.all([fetchTags(), fetchTagCounts()])
      setTags(t)
      const map: Record<string, number> = {}
      counts.forEach((c) => (map[c.tag] = c.article_count))
      setCounts(map)
      setError(null)
    } catch (e: any) {
      setError(e?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    const name = draft.name.trim()
    if (!name) {
      setError('请填写标签名')
      return
    }
    setBusy(true)
    try {
      await createTag({
        name,
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || undefined,
        color: draft.color,
      })
      setOk(`标签「${name}」已创建。`)
      setDraft({ name: '', slug: '', description: '', color: '#6366f1' })
      await load()
    } catch (err: any) {
      setError(err?.message ?? '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const patch = async (tag: Tag, next: Partial<Tag>) => {
    setError(null)
    setOk(null)
    try {
      // 后端的更新接口要求 name 非空，所以部分更新时要把原值一起带上
      await updateTag(tag.id, { name: tag.name, ...next })
      await load()
    } catch (err: any) {
      setError(err?.message ?? '更新失败')
    }
  }

  const remove = async (tag: Tag) => {
    setError(null)
    setOk(null)
    try {
      await deleteTag(tag.id)
      setOk(`已删除标签「${tag.name}」。文章里保留的同名标签会在有新文章使用时自动重建。`)
      await load()
    } catch (err: any) {
      setError(err?.message ?? '删除失败')
    }
  }

  if (loading) return <PageLoading label="正在读取标签…" />

  return (
    <div className="panel-form">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {ok ? <Notice tone="ok">{ok}</Notice> : null}

      <form className="tag-create" onSubmit={create}>
        <Field label="标签名" required>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="例如：前端工程"
            maxLength={24}
          />
        </Field>
        <Field label="标识 slug" hint="用于筛选与文章关联，建议用英文">
          <input
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            placeholder="frontend"
            maxLength={32}
          />
        </Field>
        <Field label="颜色">
          <input
            type="color"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          />
        </Field>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? <Spinner /> : <IconPlus width={15} height={15} />}
          新建标签
        </button>
      </form>

      <div className="tag-table tag-table--manage">
        <div className="tag-table__head">
          <span>标签</span>
          <span>文章数</span>
          <span>颜色</span>
          <span>操作</span>
        </div>
        {tags.map((t) => (
          <div key={t.id} className="tag-table__row">
            <span className="tag-table__name">
              <span className="tag-pill__dot" style={{ background: t.color }} />
              <span>
                <strong>{t.name}</strong>
                <em>{t.slug}</em>
              </span>
            </span>
            <span className="tag-table__count">{counts[t.slug] ?? 0}</span>
            <span>
              <input
                type="color"
                value={t.color}
                onChange={(e) => void patch(t, { color: e.target.value })}
                aria-label={`${t.name} 的颜色`}
              />
            </span>
            <span className="tag-table__ops">
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => {
                  const v = window.prompt('标签描述', t.description ?? '')
                  if (v === null) return
                  void patch(t, { description: v.trim() || null })
                }}
              >
                描述
              </button>
              <button type="button" className="btn btn--sm btn--danger-ghost" onClick={() => void remove(t)}>
                删除
              </button>
            </span>
          </div>
        ))}
        {!tags.length ? <p className="field__hint">还没有标签。写作时填写的标签也会自动出现在这里。</p> : null}
      </div>

      <p className="field__hint">
        提示：标签的删除只影响展示元数据（名称 / 颜色 / 描述），已发布文章里的标签引用不受影响。
      </p>
    </div>
  )
}

function DashboardInner() {
  const { uid, user } = useAuth()
  const { site } = useSiteSettings()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('articles')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mine, setMine] = useState<Article[]>([])
  const [publishedAll, setPublishedAll] = useState<Article[]>([])
  const [publishedTotal, setPublishedTotal] = useState(0)
  const [toDelete, setToDelete] = useState<Article | null>(null)
  const [deleting, setDeleting] = useState(false)

  useDocumentTitle(`工作台 · ${site.site_name}`)

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setError(null)
    try {
      const [m, p] = await Promise.all([fetchMyArticles(uid), fetchPublishedArticles({ pageSize: 50 })])
      setMine(m)
      setPublishedAll(p.rows)
      // 用后端 COUNT 出来的 total，而不是本页行数：单页上限 50 条，超了就数不准
      setPublishedTotal(p.total)
    } catch (e: any) {
      setError(e?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const drafts = mine.filter((a) => a.status === 'draft').length
    const views = mine.reduce((s, a) => s + (a.views ?? 0), 0)
    return {
      total: publishedTotal,
      mineCount: mine.length,
      drafts,
      views,
    }
  }, [mine, publishedTotal])

  /*
   * 迁移说明：云端版本里种子文章的归属是一个虚拟账号（'seed'），
   * 因此需要「一键划到我的名下」这个动作。现在种子数据直接挂在真实账号上，
   * 于是这一整块都不再需要。下面保留同名的空实现只是为了让 JSX 里
   * 那些引用不至于报错 —— seedArticles 恒为空，对应的提示条与按钮不会渲染。
   */
  const seedArticles: Article[] = []
  const othersArticles = publishedAll.filter((a) => a.user_id !== uid)
  const claiming = false
  const claimMsg: string | null = null
  const claim = async () => {
    /* 不再需要接管动作 */
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      // 文件清理由后端在删除文章时一并完成（先收集路径 → 删记录 → 删文件）
      await deleteArticle(toDelete.id)
      setToDelete(null)
      await load()
    } catch (e: any) {
      setError(e?.message ?? '删除失败')
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="container section">
      <header className="page-head page-head--row">
        <div>
          <h1 className="page-head__title">
            <IconSparkle width={20} height={20} />
            写作工作台
          </h1>
          <p className="page-head__sub">
            {user?.nickname || user?.email || '已登录'} · 文章保存在云端数据库，图片与附件保存在云端对象存储
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/write')}>
          <IconPlus width={16} height={16} />
          写新文章
        </button>
      </header>

      <div className="stat-grid">
        <StatCard label="站内已发布" value={stats.total} hint="所有作者的公开文章" />
        <StatCard label="我的文章" value={stats.mineCount} hint={`其中草稿 ${stats.drafts} 篇`} />
        <StatCard label="我的总阅读" value={formatCount(stats.views)} hint="由公开计数函数累加" />
        <StatCard label="标签数" value={new Set(publishedAll.flatMap((a) => a.tags ?? [])).size} hint="按已发布文章统计" />
      </div>

      {seedArticles.length ? (
        <Notice tone="info">
          <strong>发现 {seedArticles.length} 篇示例文章。</strong>
          它们目前归属「示例内容」账号，你只能读不能改。
          <button type="button" className="link-inline" onClick={() => void claim()} disabled={claiming}>
            {claiming ? '接管中…' : '一键划到我的名下'}
          </button>
        </Notice>
      ) : null}
      {claimMsg ? <Notice tone="ok">{claimMsg}</Notice> : null}
      {error ? <Notice tone="error" onClose={() => setError(null)}>{error}</Notice> : null}

      <div className="tabs tabs--page" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'articles'}
          className={cn('tabs__item', tab === 'articles' && 'is-active')}
          onClick={() => setTab('articles')}
        >
          <IconEdit width={15} height={15} />
          我的文章
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'settings'}
          className={cn('tabs__item', tab === 'settings' && 'is-active')}
          onClick={() => setTab('settings')}
        >
          <IconSettings width={15} height={15} />
          站点设置
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tags'}
          className={cn('tabs__item', tab === 'tags' && 'is-active')}
          onClick={() => setTab('tags')}
        >
          <IconTag width={15} height={15} />
          标签管理
        </button>
      </div>

      {tab === 'articles' ? (
        loading ? (
          <PageLoading />
        ) : mine.length ? (
          <div className="row-list">
            {mine.map((a) => (
              <ArticleRow key={a.id} article={a} onDelete={setToDelete} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="你还没有文章"
            description="写第一篇，或者先把示例文章划到自己名下再改。"
            action={
              <div className="state-block__action-row">
                <button type="button" className="btn btn--primary" onClick={() => navigate('/write')}>
                  写第一篇
                </button>
                {seedArticles.length ? (
                  <button type="button" className="btn btn--ghost" onClick={() => void claim()} disabled={claiming}>
                    {claiming ? <Spinner /> : null}
                    接管示例文章
                  </button>
                ) : null}
              </div>
            }
          />
        )
      ) : null}

      {tab === 'settings' && uid ? <SettingsForm uid={uid} /> : null}

      {tab === 'tags' && uid ? <TagManager uid={uid} /> : null}

      {othersArticles.length ? (
        <section className="dashboard-section">
          <h2 className="dashboard-section__title">
            <IconChart width={16} height={16} />
            站内其它作者的文章
          </h2>
          <p className="field__hint">这些文章归属其他账号，你可以读，但不能改。</p>
          <div className="mini-list">
            {othersArticles.slice(0, 6).map((a) => (
              <Link key={a.id} className="mini-list__item" to={`/article/${encodeURIComponent(a.slug)}`}>
                <span className="mini-list__title">{a.title}</span>
                <span className="mini-list__meta">
                  <IconEye width={12} height={12} />
                  {formatCount(a.views)} · {relativeTime(a.published_at ?? a.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="删除这篇文章？"
        message={
          <>
            <p>
              将永久删除<strong>「{toDelete?.title}」</strong>，以及它在云端存储里的封面、正文插图和附件。
            </p>
            <p className="modal__warn">删除不可撤销。</p>
          </>
        }
        confirmLabel="删除"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

export function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  )
}

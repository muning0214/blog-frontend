import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createArticle,
  deleteArticle,
  ensureTags,
  fetchArticleById,
  fetchTags,
  removeArticleAssets,
  signPaths,
  updateArticle,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { useDocumentTitle, useSiteSettings } from '../lib/hooks'
import type { Article, ArticleStatus, Attachment, Tag } from '../lib/types'
import { cn, estimateReadingMinutes, formatBytes, slugify, tagSlug } from '../lib/utils'
import { MarkdownView } from '../components/MarkdownView'
import { RequireAuth } from '../components/RequireAuth'
import { AttachmentPicker, CoverPicker, InlineImageButton } from '../components/Uploader'
import { ConfirmDialog, EmptyState, Field, Notice, Spinner, StatusBadge } from '../components/ui'
import {
  IconArrowLeft,
  IconCheck,
  IconClose,
  IconEye,
  IconPlus,
  IconTrash,
  IconWarning,
} from '../components/icons'

type Mode = 'write' | 'preview'

const TOOLBAR: { label: string; hint: string; snippet: (sel: string) => string; wrapAt?: [number, number] }[] = [
  { label: 'H2', hint: '二级标题', snippet: (s) => `## ${s || '小节标题'}\n` },
  { label: 'H3', hint: '三级标题', snippet: (s) => `### ${s || '子小节'}\n` },
  { label: 'B', hint: '加粗', snippet: (s) => `**${s || '加粗文字'}**` },
  { label: 'I', hint: '斜体', snippet: (s) => `*${s || '斜体'}*` },
  { label: '代码', hint: '行内代码', snippet: (s) => `\`${s || 'code'}\`` },
  { label: '代码块', hint: '围栏代码块', snippet: (s) => `\n\`\`\`ts\n${s || '// 代码'}\n\`\`\`\n` },
  { label: '链接', hint: '超链接', snippet: (s) => `[${s || '链接文字'}](https://)` },
  { label: '列表', hint: '无序列表', snippet: (s) => `\n- ${s || '要点一'}\n- 要点二\n` },
  { label: '引用', hint: '引用块', snippet: (s) => `\n> ${s || '引用内容'}\n` },
  { label: '表格', hint: '三列表格', snippet: () => `\n| 列一 | 列二 | 列三 |\n|---|---|---|\n|  |  |  |\n` },
  { label: '分割线', hint: '水平分割线', snippet: () => `\n---\n` },
]

function EditorInner() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { uid, user } = useAuth()
  const { site } = useSiteSettings()

  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [article, setArticle] = useState<Article | null>(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [coverPath, setCoverPath] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [status, setStatus] = useState<ArticleStatus>('draft')
  const [featured, setFeatured] = useState(false)

  const [allTags, setAllTags] = useState<Tag[]>([])
  const [tagInput, setTagInput] = useState('')
  const [attachPreview, setAttachPreview] = useState<Record<string, string>>({})

  const [mode, setMode] = useState<Mode>('write')
  const [split, setSplit] = useState(true)

  const [busy, setBusy] = useState<null | 'draft' | 'publish' | 'delete'>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useDocumentTitle(editing ? `编辑：${title || '未命名'} · ${site.site_name}` : `写新文章 · ${site.site_name}`)

  const reading = useMemo(() => estimateReadingMinutes(content), [content])
  const wordCount = useMemo(
    () => (content.match(/[\u3400-\u4dbf\u4e00-\u9fff]|[A-Za-z0-9_'’-]+/g) ?? []).length,
    [content],
  )

  /* ------------------------------ 载入 ------------------------------ */
  useEffect(() => {
    fetchTags()
      .then(setAllTags)
      .catch(() => setAllTags([]))
  }, [])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    fetchArticleById(Number(id))
      .then((a) => {
        if (!alive) return
        if (!a) {
          setLoadError('找不到这篇文章，或者它不属于当前账号。')
          return
        }
        setArticle(a)
        setTitle(a.title)
        setSlug(a.slug)
        setSlugTouched(true)
        setSummary(a.summary ?? '')
        setContent(a.content ?? '')
        setCoverPath(a.cover_path)
        setTags(a.tags ?? [])
        setAttachments(a.attachments ?? [])
        setStatus(a.status)
        setFeatured(a.featured)
        setSavedAt(a.updated_at)
        setLoadError(null)
      })
      .catch((e) => {
        if (alive) setLoadError(e?.message ?? '加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  /* 封面预览：对象键 → 签名地址 */
  useEffect(() => {
    let alive = true
    if (!coverPath) {
      setCoverPreview(null)
      return
    }
    signPaths([coverPath])
      .then((m) => {
        if (alive) setCoverPreview(m[coverPath] ?? null)
      })
      .catch(() => {
        if (alive) setCoverPreview(null)
      })
    return () => {
      alive = false
    }
  }, [coverPath])

  /* 附件里是图片的，取缩略图 */
  useEffect(() => {
    let alive = true
    const images = attachments.filter((a) => a.mime.startsWith('image/')).map((a) => a.path)
    if (!images.length) {
      setAttachPreview({})
      return
    }
    signPaths(images)
      .then((m) => {
        if (alive) setAttachPreview(m)
      })
      .catch(() => {
        if (alive) setAttachPreview({})
      })
    return () => {
      alive = false
    }
  }, [attachments])

  /* 任何字段变化都标记为未保存 */
  useEffect(() => {
    setDirty(true)
  }, [title, slug, summary, content, coverPath, tags, attachments, status, featured])

  /* ------------------------------ 工具条 ------------------------------ */
  const insert = (snippet: (sel: string) => string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = content.slice(start, end)
    const text = snippet(selected)
    const next = content.slice(0, start) + text + content.slice(end)
    setContent(next)
    // 让光标落在插入内容之后
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  const insertImage = (markdown: string) => {
    setContent((c) => {
      const el = textareaRef.current
      if (!el) return c + markdown
      const pos = el.selectionStart ?? c.length
      return c.slice(0, pos) + markdown + c.slice(pos)
    })
  }

  const addTag = (raw: string) => {
    const s = tagSlug(raw)
    if (!s) return
    setTags((prev) => (prev.includes(s) ? prev : [...prev, s]))
    setTagInput('')
  }

  /* ------------------------------ 保存 ------------------------------ */
  const persist = useCallback(
    async (nextStatus: ArticleStatus) => {
      if (!uid) return
      if (!title.trim()) {
        setError('请先填写标题')
        return
      }
      setBusy(nextStatus === 'published' ? 'publish' : 'draft')
      setError(null)
      try {
        const finalSlug = (slug.trim() || slugify(title)).replace(/\s+/g, '-')
        const payload = {
          title: title.trim(),
          slug: finalSlug,
          summary: summary.trim() || null,
          content,
          cover_path: coverPath,
          tags,
          attachments,
          status: nextStatus,
          featured,
          reading_minutes: reading,
          author_name: article?.author_name ?? user?.nickname ?? null,
          published_at:
            nextStatus === 'published'
              ? article?.published_at ?? new Date().toISOString()
              : article?.published_at ?? null,
        }

        await ensureTags(tags)

        if (article) {
          const updated = await updateArticle(article.id, payload)
          setArticle(updated)
          setSlug(updated.slug)
          setSavedAt(updated.updated_at)
          setStatus(updated.status)
        } else {
          const created = await createArticle(payload)
          setArticle(created)
          setSlug(created.slug)
          setSlugTouched(true)
          setSavedAt(created.updated_at)
          setStatus(created.status)
          // 首次保存后切到编辑地址，后续保存走更新
          navigate(`/write/${created.id}`, { replace: true })
        }
        setDirty(false)
        setAllTags(await fetchTags().catch(() => allTags))
      } catch (e: any) {
        if (e?.code === '42501') {
          setError('没有权限保存：请确认已登录，且这篇文章属于当前账号。')
        } else {
          setError(e?.message ?? '保存失败')
        }
      } finally {
        setBusy(null)
      }
    },
    [
      uid,
      title,
      slug,
      summary,
      content,
      coverPath,
      tags,
      attachments,
      featured,
      reading,
      article,
      user?.nickname,
      navigate,
      allTags,
    ],
  )

  /* Ctrl / Cmd + S 保存 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (busy) return
        void persist(status === 'published' ? 'published' : 'draft')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [persist, busy, status])

  const handleDelete = async () => {
    if (!article) return
    setBusy('delete')
    try {
      await removeArticleAssets(article)
      await deleteArticle(article.id)
      navigate('/dashboard', { replace: true })
    } catch (e: any) {
      setError(e?.message ?? '删除失败')
      setConfirmDelete(false)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="container section">
        <div className="state-block">
          <Spinner label="正在读取文章…" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container section">
        <EmptyState
          title="打不开这篇文章"
          description={loadError}
          action={
            <Link className="btn btn--primary" to="/dashboard">
              回工作台
            </Link>
          }
        />
      </div>
    )
  }

  const suggestions = tagInput
    ? allTags.filter(
        (t) =>
          !tags.includes(t.slug) &&
          (t.name.includes(tagInput) || t.slug.includes(tagInput.toLowerCase())),
      )
    : allTags.filter((t) => !tags.includes(t.slug)).slice(0, 8)

  return (
    <div className="container section editor-page">
      <header className="editor-head">
        <div className="editor-head__left">
          <Link className="link-inline" to="/dashboard">
            <IconArrowLeft width={14} height={14} />
            工作台
          </Link>
          <h1 className="editor-head__title">{editing ? '编辑文章' : '写新文章'}</h1>
          {article ? <StatusBadge status={status} /> : null}
        </div>

        <div className="editor-head__right">
          {savedAt ? (
            <span className={cn('save-state', dirty && 'save-state--dirty')}>
              {dirty ? (
                <>
                  <IconWarning width={13} height={13} />
                  有未保存的改动
                </>
              ) : (
                <>
                  <IconCheck width={13} height={13} />
                  已保存 {new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </span>
          ) : null}

          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void persist('draft')}
            disabled={busy !== null}
          >
            {busy === 'draft' ? <Spinner /> : null}
            保存草稿
          </button>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void persist('published')}
            disabled={busy !== null}
          >
            {busy === 'publish' ? <Spinner /> : null}
            {status === 'published' ? '更新发布' : '发布'}
          </button>

          {article ? (
            <>
              <Link className="btn btn--ghost" to={`/article/${encodeURIComponent(article.slug)}`}>
                <IconEye width={15} height={15} />
                查看
              </Link>
              <button
                type="button"
                className="btn btn--danger-ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={busy !== null}
                aria-label="删除文章"
              >
                <IconTrash width={15} height={15} />
              </button>
            </>
          ) : null}
        </div>
      </header>

      {error ? (
        <Notice tone="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      ) : null}

      <div className="editor-grid">
        <div className="editor-main">
          <input
            className="editor-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slugTouched) setSlug(slugify(e.target.value))
            }}
            placeholder="文章标题"
            maxLength={120}
          />

          <div className="editor-subrow">
            <span className="editor-slug">
              <span className="editor-slug__prefix">#/article/</span>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value.replace(/\s+/g, '-'))
                }}
                placeholder="url-slug"
                maxLength={80}
              />
            </span>
            <span className="editor-count">
              {wordCount} 字 · 约 {reading} 分钟
            </span>
          </div>

          <div className="editor-toolbar">
            <div className="editor-toolbar__group">
              {TOOLBAR.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className="tool-btn"
                  title={t.hint}
                  onClick={() => insert(t.snippet)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="editor-toolbar__group">
              <InlineImageButton onInsert={insertImage} />
              <button
                type="button"
                className={cn('tool-btn', split && 'is-on')}
                onClick={() => setSplit((v) => !v)}
                title="并排预览"
              >
                并排
              </button>
              <button
                type="button"
                className={cn('tool-btn', mode === 'preview' && 'is-on')}
                onClick={() => setMode((m) => (m === 'write' ? 'preview' : 'write'))}
                title="切换预览"
              >
                {mode === 'write' ? '预览' : '写作'}
              </button>
            </div>
          </div>

          <div className={cn('editor-panes', split && mode === 'write' && 'editor-panes--split')}>
            {mode === 'write' ? (
              <textarea
                ref={textareaRef}
                className="editor-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={'在这里用 Markdown 写作…\n\n支持标题、列表、表格、引用、代码块。\n插入的图片会上传到云端存储，正文里保存的是对象键。'}
                spellCheck={false}
              />
            ) : null}

            {split || mode === 'preview' ? (
              <div className="editor-preview">
                <div className="editor-preview__label">预览</div>
                {content.trim() ? (
                  <MarkdownView markdown={content} />
                ) : (
                  <p className="editor-preview__empty">正文还是空的。</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="editor-side">
          <section className="side-panel">
            <h3 className="side-panel__title">发布</h3>
            <Field label="状态">
              <select value={status} onChange={(e) => setStatus(e.target.value as ArticleStatus)}>
                <option value="draft">草稿（仅自己可见）</option>
                <option value="published">已发布（所有人可见）</option>
              </select>
            </Field>
            <label className="switch">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <span className="switch__track" />
              <span className="switch__label">在首页精选位展示</span>
            </label>
            <p className="field__hint">
              快捷键 <kbd>Ctrl</kbd> + <kbd>S</kbd> 保存。保存与发布都会同步到云端数据库。
            </p>
          </section>

          <section className="side-panel">
            <h3 className="side-panel__title">摘要</h3>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="一两句话说明这篇文章讲什么，会显示在列表卡片上"
              maxLength={200}
            />
            <p className="field__hint">{summary.length} / 200</p>
          </section>

          <section className="side-panel">
            <h3 className="side-panel__title">标签</h3>
            <div className="tag-editor">
              {tags.map((t) => (
                <span key={t} className="tag-chip">
                  {allTags.find((x) => x.slug === t)?.name ?? t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    aria-label={`移除标签 ${t}`}
                  >
                    <IconClose width={12} height={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="tag-input">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag(tagInput)
                  }
                  if (e.key === 'Backspace' && !tagInput && tags.length) {
                    setTags(tags.slice(0, -1))
                  }
                }}
                placeholder="输入后回车添加"
              />
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => addTag(tagInput)}>
                <IconPlus width={14} height={14} />
              </button>
            </div>
            {suggestions.length ? (
              <div className="tag-suggest">
                {suggestions.slice(0, 8).map((t) => (
                  <button key={t.slug} type="button" onClick={() => addTag(t.slug)}>
                    <span className="tag-pill__dot" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="field__hint">新标签会自动建入标签表，读者可在标签页按它筛选。</p>
          </section>

          <section className="side-panel">
            <h3 className="side-panel__title">封面</h3>
            <CoverPicker value={coverPath} onChange={setCoverPath} preview={coverPreview} />
          </section>

          <section className="side-panel">
            <h3 className="side-panel__title">附件</h3>
            <AttachmentPicker value={attachments} onChange={setAttachments} previewUrls={attachPreview} />
            {attachments.length ? (
              <p className="field__hint">
                合计 {formatBytes(attachments.reduce((s, a) => s + (a.size ?? 0), 0))}
              </p>
            ) : null}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="删除这篇文章？"
        message={
          <>
            <p>
              将永久删除<strong>「{title || '未命名'}」</strong>及其云端文件（封面 / 插图 / 附件）。
            </p>
            <p className="modal__warn">删除不可撤销。</p>
          </>
        }
        confirmLabel="删除"
        busy={busy === 'delete'}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

export function EditorPage() {
  return (
    <RequireAuth>
      <EditorInner />
    </RequireAuth>
  )
}

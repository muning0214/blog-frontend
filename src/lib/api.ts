import { ApiError, assetUrl, request } from './http'
import type {
  Article,
  ArticleInput,
  Attachment,
  Paged,
  SiteSettings,
  Tag,
  TagCount,
} from './types'

export { ApiError, assetUrl } from './http'

/** 后端分页响应的形状（Jackson 的 SNAKE_CASE 策略下 totalPages 会变成 total_pages） */
type RawPage<T> = {
  list: T[]
  total: number
  page: number
  size: number
  total_pages: number
}

function toPaged<T>(raw: RawPage<T> | null | undefined): Paged<T> {
  const rows = raw?.list ?? []
  return {
    rows,
    total: raw?.total ?? rows.length,
    page: raw?.page ?? 1,
    pageSize: raw?.size ?? rows.length,
    totalPages: Math.max(1, raw?.total_pages ?? 1),
  }
}

/* ------------------------------------------------------------------ */
/* 文章                                                                */
/* ------------------------------------------------------------------ */

export type ListOptions = {
  tag?: string | null
  keyword?: string | null
  page?: number
  pageSize?: number
  featuredOnly?: boolean
  status?: 'draft' | 'published' | null
}

/** 公开文章列表：不需要登录，后端只会返回已发布的 */
export async function fetchPublishedArticles(opts: ListOptions = {}): Promise<Paged<Article>> {
  const raw = await request<RawPage<Article>>('/articles', {
    query: {
      keyword: opts.keyword ?? undefined,
      tag: opts.tag ?? undefined,
      featuredOnly: opts.featuredOnly ? true : undefined,
      page: opts.page ?? 1,
      size: opts.pageSize ?? 6,
    },
  })
  return toPaged(raw)
}

/**
 * 按 slug 取已发布文章详情。
 * 阅读量由后端在这一步原子自增，前端不需要再调任何计数接口。
 */
export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  try {
    return await request<Article>(`/articles/${encodeURIComponent(slug)}`)
  } catch (e: any) {
    if (e?.status === 404) return null
    throw e
  }
}

/** 作者按 id 取自己的文章（含草稿与正文），用于编辑器 */
export async function fetchArticleById(id: number): Promise<Article | null> {
  try {
    return await request<Article>(`/author/articles/${id}`)
  } catch (e: any) {
    if (e?.status === 404 || e?.status === 403) return null
    throw e
  }
}

/**
 * 取当前作者的全部文章（含草稿）。
 * 后端单页上限 50，这里循环翻页取全 —— 工作台的统计与列表都依赖完整数据。
 */
export async function fetchMyArticles(_uid?: string | number | null): Promise<Article[]> {
  const pageSize = 50
  const first = toPaged(
    await request<RawPage<Article>>('/author/articles', { query: { page: 1, size: pageSize } }),
  )
  const all = [...first.rows]
  const maxPages = Math.min(first.totalPages, 20)
  for (let page = 2; page <= maxPages; page++) {
    const next = toPaged(
      await request<RawPage<Article>>('/author/articles', { query: { page, size: pageSize } }),
    )
    all.push(...next.rows)
    if (next.rows.length < pageSize) break
  }
  return all
}

/** 同标签的其它已发布文章 */
export async function fetchRelated(article: Article, limit = 3): Promise<Article[]> {
  if (!article.tags?.length || !article.slug) return []
  try {
    return (
      (await request<Article[]>(`/articles/${encodeURIComponent(article.slug)}/related`, {
        query: { limit },
      })) ?? []
    )
  } catch {
    return []
  }
}

/** 上一篇 / 下一篇 */
export async function fetchNeighbours(article: Article) {
  if (!article.slug) return { prev: null, next: null }
  try {
    return await request<{ prev: Article | null; next: Article | null }>(
      `/articles/${encodeURIComponent(article.slug)}/neighbours`,
    )
  } catch {
    return { prev: null, next: null }
  }
}

export async function createArticle(input: ArticleInput): Promise<Article> {
  return request<Article>('/author/articles', { method: 'POST', body: input })
}

export async function updateArticle(id: number, patch: Partial<ArticleInput>): Promise<Article> {
  return request<Article>(`/author/articles/${id}`, { method: 'PUT', body: patch })
}

export async function deleteArticle(id: number): Promise<void> {
  await request<void>(`/author/articles/${id}`, { method: 'DELETE' })
}

/** 保留导出以兼容既有调用点：阅读量已由后端负责，前端不再触发 */
export async function incrementViews(_id: number): Promise<number | null> {
  return null
}

/* ------------------------------------------------------------------ */
/* 标签                                                                */
/* ------------------------------------------------------------------ */

export async function fetchTags(): Promise<Tag[]> {
  return (await request<Tag[]>('/tags')) ?? []
}

/** 标签 + 已发布文章数（后端聚合，前端不再把整站文章拉下来自己数） */
export async function fetchTagCounts(): Promise<TagCount[]> {
  const rows = (await request<TagCount[]>('/tags/counts')) ?? []
  return rows.map((r) => ({
    tag: r.tag,
    article_count: Number(r.article_count ?? 0),
    latest_at: r.latest_at,
  }))
}

/** 保留导出以兼容既有调用点：标签现在由后端在保存文章时按需自动创建 */
export async function ensureTags(_slugs: string[]): Promise<void> {
  /* no-op */
}

/* ------------------------------------------------------------------ */
/* 兼容层：保留旧函数名，内部改走新的 REST 接口                        */
/* ------------------------------------------------------------------ */

/**
 * 兼容旧调用点：把一批对象键解析成可访问地址。
 * 云端版本里这是个异步网络调用（换取短时签名 URL），现在是纯字符串拼接，
 * 但依然返回 Promise，调用方一行都不用改。
 */
export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const p of paths.filter(Boolean)) {
    const url = assetUrl(p)
    if (url) out[p] = url
  }
  return out
}

/** 兼容旧调用点：单个对象键 → 可访问地址 */
export async function signOne(path: string): Promise<string> {
  const url = assetUrl(path)
  if (!url) throw new ApiError('文件路径为空', 400)
  return url
}

/**
 * 兼容旧调用点：上传并返回对象键。
 * uid 参数已无意义（后端按登录令牌识别身份），保留只是为了让调用方不改。
 */
export async function uploadToShared(
  _uid: string | number | null,
  folder: UploadFolder,
  file: File,
): Promise<string> {
  return (await uploadFile(folder, file)).path
}

/* ------------------------------------------------------------------ */
/* 标签维护（工作台的标签管理用）                                      */
/* ------------------------------------------------------------------ */

export async function createTag(payload: Partial<Tag>): Promise<Tag> {
  return request<Tag>('/author/tags', { method: 'POST', body: payload })
}

/** 后端要求 name 非空，调用方更新单个字段时记得把 name 一起带上 */
export async function updateTag(id: number, payload: Partial<Tag>): Promise<Tag> {
  return request<Tag>(`/author/tags/${id}`, { method: 'PUT', body: payload })
}

export async function deleteTag(id: number): Promise<void> {
  await request<void>(`/author/tags/${id}`, { method: 'DELETE' })
}

/* ------------------------------------------------------------------ */
/* 站点设置                                                            */
/* ------------------------------------------------------------------ */

/** 数据库里还没有配置行时返回 null，调用方用内置默认值兜底 */
export async function fetchSettings(): Promise<SiteSettings | null> {
  return request<SiteSettings | null>('/settings')
}

export async function saveSettings(
  payload: Partial<SiteSettings>,
  _current?: SiteSettings | null,
  _uid?: string | number | null,
): Promise<SiteSettings> {
  return request<SiteSettings>('/author/settings', { method: 'PUT', body: payload })
}

/* ------------------------------------------------------------------ */
/* 文件                                                                */
/* ------------------------------------------------------------------ */

export type UploadResult = {
  name: string
  path: string
  url: string
  size: number
  mime: string
}

export type UploadFolder = 'covers' | 'images' | 'attachments' | 'avatars'

/**
 * 上传文件。
 *
 * 返回 path（存进数据库的对象键）与 url（可直接访问的地址）：
 * - 封面存 path，展示时由 assetUrl 解析
 * - 正文插图直接把 url 写进 Markdown，交给浏览器自行解析
 * 落盘文件名由后端用 UUID 重新生成，前端传来的原始名仅用于展示。
 */
export async function uploadFile(folder: UploadFolder, file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  return request<UploadResult>('/author/files', {
    method: 'POST',
    query: { folder },
    formData: form,
  })
}

/** 删除一个已上传文件（传对象键，不是完整 URL） */
export async function removeObjects(paths: string[]): Promise<void> {
  for (const path of paths.filter(Boolean)) {
    try {
      await request<void>('/author/files', { method: 'DELETE', query: { path } })
    } catch {
      // 单个文件删除失败不影响其它文件
    }
  }
}

/** 文章引用到的所有对象键：封面 + 附件 + 正文里的 /uploads 路径 */
export function collectObjectPaths(
  article: Pick<Article, 'cover_path' | 'content' | 'attachments'>,
) {
  const refs = new Set<string>()
  if (article.cover_path) refs.add(article.cover_path)
  for (const a of article.attachments ?? []) if (a?.path) refs.add(a.path)
  const content = article.content ?? ''
  for (const m of content.matchAll(
    /\/uploads\/((?:covers|images|avatars|attachments)\/[A-Za-z0-9._-]+)/g,
  )) {
    refs.add(m[1])
  }
  return [...refs]
}

/**
 * 保留导出以兼容既有调用点。
 * 文件清理已由后端在删除文章时完成（先收集路径 → 删记录 → 删文件），
 * 前端再删一次是多余的。
 */
export async function removeArticleAssets(_article: Article): Promise<void> {
  /* no-op */
}

export type { Article, ArticleInput, Attachment, Tag, TagCount, SiteSettings }

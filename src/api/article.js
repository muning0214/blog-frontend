import request from './request'

/**
 * 后端分页响应 -> 前端统一形状。
 * 后端返回的是 { list, total, page, size, total_pages }（Jackson 的 SNAKE_CASE 策略产物），
 * 这里收敛成 rows / totalPages，视图层只认这一种。
 */
function toPaged(raw) {
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
/* 公开读取（匿名可访问，后端只返回已发布的文章）                        */
/* ------------------------------------------------------------------ */

export async function fetchPublishedArticles(params = {}) {
  const raw = await request.get('/articles', {
    params: {
      keyword: params.keyword || undefined,
      tag: params.tag || undefined,
      featuredOnly: params.featuredOnly ? true : undefined,
      page: params.page || 1,
      size: params.pageSize || 6,
    },
  })
  return toPaged(raw)
}

/** 按 slug 取详情。阅读量由后端在这一次请求里原子自增，前端不需要也不应该再触发。 */
export async function fetchArticleBySlug(slug) {
  try {
    return await request.get(`/articles/${encodeURIComponent(slug)}`)
  } catch (e) {
    if (e.status === 404) return null
    throw e
  }
}

export async function fetchRelated(slug, limit = 3) {
  if (!slug) return []
  try {
    return (await request.get(`/articles/${encodeURIComponent(slug)}/related`, { params: { limit } })) || []
  } catch {
    return []
  }
}

export async function fetchNeighbours(slug) {
  if (!slug) return { prev: null, next: null }
  try {
    return await request.get(`/articles/${encodeURIComponent(slug)}/neighbours`)
  } catch {
    return { prev: null, next: null }
  }
}

/* ------------------------------------------------------------------ */
/* 作者侧（需要令牌）                                                  */
/* ------------------------------------------------------------------ */

/**
 * 我的全部文章（含草稿）。
 * 后端单页上限 50，这里循环翻页取全 —— 工作台的统计与列表都依赖完整数据，
 * 只取第一页会让「我的文章数」在超过 50 篇之后悄悄变错。
 */
export async function fetchMyArticles() {
  const pageSize = 50
  const first = toPaged(await request.get('/author/articles', { params: { page: 1, size: pageSize } }))
  const all = [...first.rows]
  const maxPages = Math.min(first.totalPages, 20)
  for (let page = 2; page <= maxPages; page++) {
    const next = toPaged(await request.get('/author/articles', { params: { page, size: pageSize } }))
    all.push(...next.rows)
    if (next.rows.length < pageSize) break
  }
  return all
}

export function fetchMyArticleById(id) {
  return request.get(`/author/articles/${id}`)
}

export function createArticle(payload) {
  return request.post('/author/articles', payload)
}

export function updateArticle(id, payload) {
  return request.put(`/author/articles/${id}`, payload)
}

export function deleteArticle(id) {
  return request.delete(`/author/articles/${id}`)
}

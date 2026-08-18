import request from './request'

// ===== Public =====

/** Paginated published articles */
export function getArticles(params) {
  return request.get('/articles', { params })
}

/** Archive list */
export function getArchives(params) {
  return request.get('/articles/archives', { params })
}

/** Article detail (public) */
export function getArticleDetail(id) {
  return request.get(`/articles/${id}`)
}

// ===== Admin =====

/** Admin paginated list (includes drafts) */
export function getAdminArticles(params) {
  return request.get('/admin/articles', { params })
}

/** Admin article detail */
export function getAdminArticleDetail(id) {
  return request.get(`/admin/articles/${id}`)
}

/** Create article */
export function createArticle(data) {
  return request.post('/admin/articles', data)
}

/** Update article */
export function updateArticle(id, data) {
  return request.put(`/admin/articles/${id}`, data)
}

/** Delete article */
export function deleteArticle(id) {
  return request.delete(`/admin/articles/${id}`)
}

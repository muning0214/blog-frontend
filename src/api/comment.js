import request from './request'

// ===== Public =====

/** Approved comment tree for an article */
export function getComments(articleId) {
  return request.get(`/comments/article/${articleId}`)
}

/** Submit a comment (guest) */
export function submitComment(data) {
  return request.post('/comments', data)
}

// ===== Admin =====

/** Admin paginated comments */
export function getAdminComments(params) {
  return request.get('/admin/comments', { params })
}

/** Approve / reject comment */
export function updateCommentStatus(id, status) {
  return request.put(`/admin/comments/${id}/status`, { status })
}

/** Delete comment */
export function deleteComment(id) {
  return request.delete(`/admin/comments/${id}`)
}

import request from './request'

// ===== Public =====

/** List tags with article count */
export function getTags() {
  return request.get('/tags')
}

// ===== Admin =====

export function getAdminTags() {
  return request.get('/admin/tags')
}

export function createTag(data) {
  return request.post('/admin/tags', data)
}

export function updateTag(id, data) {
  return request.put(`/admin/tags/${id}`, data)
}

export function deleteTag(id) {
  return request.delete(`/admin/tags/${id}`)
}

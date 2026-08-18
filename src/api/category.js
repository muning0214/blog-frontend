import request from './request'

// ===== Public =====

/** List categories with article count */
export function getCategories() {
  return request.get('/categories')
}

// ===== Admin =====

export function getAdminCategories() {
  return request.get('/admin/categories')
}

export function createCategory(data) {
  return request.post('/admin/categories', data)
}

export function updateCategory(id, data) {
  return request.put(`/admin/categories/${id}`, data)
}

export function deleteCategory(id) {
  return request.delete(`/admin/categories/${id}`)
}

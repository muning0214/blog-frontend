import request from './request'

/** Dashboard stats */
export function getStats() {
  return request.get('/admin/dashboard/stats')
}

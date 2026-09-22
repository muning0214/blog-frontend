import request from './request'

/** 全部标签（含没有任何文章的空标签，标签管理需要） */
export function fetchTags() {
  return request.get('/tags')
}

/**
 * 标签 + 已发布文章数。
 * 聚合在后端做：前端只拿十几行统计，而不是把整站文章拉下来自己数。
 * 注意它只返回「有文章」的标签，用于标签云；标签管理要用上面的 fetchTags()。
 */
export function fetchTagCounts() {
  return request.get('/tags/counts')
}

/* ------------------------------------------------------------------ */
/* 作者侧（需要令牌）                                                  */
/* ------------------------------------------------------------------ */

export function fetchAuthorTags() {
  return request.get('/author/tags')
}

export function createTag(payload) {
  return request.post('/author/tags', payload)
}

/** 后端要求 name 非空，做局部更新时记得把原 name 一起带上 */
export function updateTag(id, payload) {
  return request.put(`/author/tags/${id}`, payload)
}

export function deleteTag(id) {
  return request.delete(`/author/tags/${id}`)
}

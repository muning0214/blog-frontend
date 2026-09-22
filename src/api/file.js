import request from './request'

/**
 * 上传文件。
 *
 * 返回 { name, path, url, size, mime }：
 * - 封面存 path（对象键），展示时由 assetUrl 解析
 * - 正文插图直接用 url 写进 Markdown，交给浏览器自行解析
 *
 * 不设 Content-Type ——multipart 的 boundary 必须由浏览器自己生成。
 * 落盘文件名由后端用 UUID 重新生成，前端传来的原始名只用于展示。
 */
export function uploadFile(file, folder = 'images') {
  const form = new FormData()
  form.append('file', file)
  return request.post('/author/files', form, { params: { folder } })
}

/** 删除一个已上传文件（传对象键，不是完整 URL） */
export function deleteFile(path) {
  return request.delete('/author/files', { params: { path } })
}

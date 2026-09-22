import request from './request'

/**
 * 站点配置。数据库里还没有配置行时后端返回 null，由前端用内置默认值兜底
 * （见 composables/useSiteSettings.js）。
 */
export function fetchSettings() {
  return request.get('/settings')
}

/** 保存站点配置（需要令牌，只覆盖传了值的字段） */
export function saveSettings(payload) {
  return request.put('/author/settings', payload)
}

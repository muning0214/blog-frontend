const KEY = 'devlog_oauth_pending'

/**
 * 记录「这次 OAuth 跳转是登录还是绑定，以及要回到哪里」。
 *
 * 为什么需要它：GitHub OAuth App 只允许登记一个回调地址，
 * 所以两条流程最终都会回到同一个前端页面，页面本身看不出该调哪个接口。
 * 这里以 state 为键把意图存进 sessionStorage，回调页再按 state 取回来 ——
 * 用 state 做键而不是用一个固定键，可以避免上一次遗留的值被这一次误用。
 *
 * 用 sessionStorage 而不是 localStorage：意图只对「当前这次跳转」有效，
 * 关掉标签页就该失效。
 */
export function rememberOAuthIntent(state, mode, redirect) {
  if (!state) return
  try {
    const map = JSON.parse(sessionStorage.getItem(KEY) || '{}')
    map[state] = { mode, redirect: redirect || '' }
    sessionStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* 隐私模式下 sessionStorage 可能不可写；回调页会退化成按登录处理 */
  }
}

/**
 * 取出并删除（一次性）。
 * 取不到时按「登录」处理 —— 这是安全的默认值：
 * 宁可多走一次没意义的登录，也不能在意图不明时误触发账号绑定。
 */
export function takeOAuthIntent(state) {
  try {
    const map = JSON.parse(sessionStorage.getItem(KEY) || '{}')
    const entry = map[state]
    delete map[state]
    sessionStorage.setItem(KEY, JSON.stringify(map))
    if (entry && entry.mode === 'bind') {
      return { mode: 'bind', redirect: entry.redirect || '/admin/account' }
    }
    return { mode: 'login', redirect: (entry && entry.redirect) || '/admin/dashboard' }
  } catch {
    return { mode: 'login', redirect: '/admin/dashboard' }
  }
}

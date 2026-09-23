import { createRouter, createWebHistory } from 'vue-router'
import { message } from 'ant-design-vue'
import { setUnauthorizedHandler } from '@/api/request'
import { useUserStore } from '@/store/user'

const routes = [
  // ===== 前台 =====
  {
    path: '/',
    component: () => import('@/components/BlogLayout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('@/views/blog/Home.vue') },
      { path: 'articles', name: 'ArticleList', component: () => import('@/views/blog/ArticleList.vue') },
      {
        path: 'article/:slug',
        name: 'ArticleDetail',
        component: () => import('@/views/blog/ArticleDetail.vue'),
      },
      { path: 'tags', name: 'Tags', component: () => import('@/views/blog/Tags.vue') },
      { path: 'about', name: 'About', component: () => import('@/views/blog/About.vue') },
    ],
  },

  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },

  {
    // GitHub 授权回调。必须是独立路由（不套 BlogLayout）：
    // 它是中转页，落地后立刻跳走，不该出现页头页脚。
    // 这个地址要与 GitHub OAuth App 里登记的 Authorization callback URL 完全一致。
    path: '/auth/github/callback',
    name: 'GithubCallback',
    component: () => import('@/views/GithubCallback.vue'),
  },

  // ===== 作者后台 =====
  {
    path: '/admin',
    component: () => import('@/components/AdminLayout.vue'),
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { requiresAuth: true, title: '工作台' },
      },
      {
        // :id 缺省表示新建，路径形态与原有项目一致
        path: 'article/edit/:id?',
        name: 'ArticleEdit',
        component: () => import('@/views/admin/ArticleEdit.vue'),
        meta: { requiresAuth: true, title: '编辑文章' },
      },
      {
        path: 'account',
        name: 'Account',
        component: () => import('@/views/admin/Account.vue'),
        meta: { requiresAuth: true, title: '账号' },
      },
    ],
  },

  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const store = useUserStore()

  if (to.meta.requiresAuth) {
    await store.ensureLoaded()
    if (!store.state.user) {
      message.warning('请先登录')
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  if (to.path === '/login') {
    await store.ensureLoaded()
    if (store.state.user) {
      return { path: '/admin/dashboard' }
    }
  }

  return true
})

/**
 * 任意请求返回 401（令牌过期 / 被吊销）时统一处理：
 * 清掉本地登录态并送回登录页。
 *
 * 这一段是原实现缺失的环节 —— 当时后端把 401 包成 HTTP 200，
 * 前端按 status 判断的分支永远不命中，于是令牌失效后用户既不跳登录
 * 也不清凭据，只看到一堆报错提示，卡在后台页面上。
 */
setUnauthorizedHandler(() => {
  const store = useUserStore()
  store.clear()
  const current = router.currentRoute.value
  // 已经在登录页就不要再跳了：否则会把 redirect 参数套娃，
  // 登录成功后反而被送回 /login，看起来像「登录了却进不去工作台」
  if (current.path === '/login') return
  message.warning('登录已过期，请重新登录')
  router.replace({ path: '/login', query: { redirect: current.fullPath } })
})

export default router

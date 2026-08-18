import { createRouter, createWebHistory } from 'vue-router'
import { message } from 'ant-design-vue'

const routes = [
  // ===== Blog front-end =====
  {
    path: '/',
    component: () => import('@/components/BlogLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/blog/Home.vue')
      },
      {
        path: 'article/:id',
        name: 'ArticleDetail',
        component: () => import('@/views/blog/ArticleDetail.vue')
      },
      {
        path: 'archives',
        name: 'Archives',
        component: () => import('@/views/blog/Archives.vue')
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/blog/Categories.vue')
      },
      {
        path: 'tags',
        name: 'Tags',
        component: () => import('@/views/blog/Tags.vue')
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('@/views/blog/About.vue')
      }
    ]
  },

  // ===== Login =====
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },

  // ===== Admin back-end =====
  {
    path: '/admin',
    component: () => import('@/views/admin/Layout.vue'),
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { requiresAuth: true, title: '仪表盘' }
      },
      {
        path: 'articles',
        name: 'ArticleManage',
        component: () => import('@/views/admin/ArticleManage.vue'),
        meta: { requiresAuth: true, title: '文章管理' }
      },
      {
        path: 'article/edit/:id?',
        name: 'ArticleEdit',
        component: () => import('@/views/admin/ArticleEdit.vue'),
        meta: { requiresAuth: true, title: '编辑文章' }
      },
      {
        path: 'categories',
        name: 'CategoryManage',
        component: () => import('@/views/admin/CategoryManage.vue'),
        meta: { requiresAuth: true, title: '分类管理' }
      },
      {
        path: 'comments',
        name: 'CommentManage',
        component: () => import('@/views/admin/CommentManage.vue'),
        meta: { requiresAuth: true, title: '评论审核' }
      }
    ]
  },

  // 404 fallback
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// ===== Global route guard =====
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('blog_token')

  if (to.meta.requiresAuth && !token) {
    // Not logged in -> redirect to login page with redirect query
    message.warning('请先登录')
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && token) {
    // Already logged in, skip login page
    next('/admin/dashboard')
  } else {
    next()
  }
})

export default router

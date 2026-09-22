<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store/user'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useTheme } from '@/composables/useTheme'
import { assetUrl } from '@/api/request'
import { formatCount } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { state, logout } = useUserStore()
const { site } = useSiteSettings()
const { isDark, toggleTheme } = useTheme()

const NAV = [
  { name: 'Home', label: '首页' },
  { name: 'ArticleList', label: '文章' },
  { name: 'Tags', label: '标签' },
  { name: 'About', label: '关于' },
]

const keyword = ref('')
const drawerOpen = ref(false)

/* 路由变化时收起移动端抽屉 */
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)

const isActive = (name) => route.name === name || (name === 'ArticleList' && route.name === 'ArticleDetail')

const avatarUrl = computed(() => assetUrl(site.value.avatar_path))
const initial = computed(() => (site.value.author_name || 'D').slice(0, 1))

const search = () => {
  const q = keyword.value.trim()
  router.push({ name: 'ArticleList', query: q ? { q } : {} })
}

const onUserMenu = async ({ key }) => {
  if (key === 'dashboard') router.push({ name: 'Dashboard' })
  else if (key === 'write') router.push({ name: 'ArticleEdit' })
  else if (key === 'account') router.push({ name: 'Account' })
  else if (key === 'logout') {
    await logout()
    message.success('已退出登录')
    router.push({ name: 'Home' })
  }
}

const year = new Date().getFullYear()
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="container site-header__inner">
        <RouterLink class="brand" :to="{ name: 'Home' }">
          <span class="brand__mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 8l-3 4 3 4M15 8l3 4-3 4M13 5.5l-2 13" />
            </svg>
          </span>
          <span class="brand__text">
            <span class="brand__name">{{ site.site_name }}</span>
            <span class="brand__tag">{{ site.tagline }}</span>
          </span>
        </RouterLink>

        <nav class="site-nav" aria-label="主导航">
          <RouterLink
            v-for="item in NAV"
            :key="item.name"
            class="site-nav__link"
            :class="{ 'is-active': isActive(item.name) }"
            :to="{ name: item.name }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="site-header__side">
          <form class="header-search" role="search" @submit.prevent="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" />
            </svg>
            <input v-model="keyword" type="search" placeholder="搜索文章…" aria-label="搜索文章" />
          </form>

          <a-tooltip :title="isDark ? '切换到浅色' : '切换到深色'">
            <button class="icon-btn" type="button" :aria-label="isDark ? '切换到浅色' : '切换到深色'" @click="toggleTheme">
              <svg v-if="isDark" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6" />
              </svg>
              <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.5 14.2A8.6 8.6 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7z" />
              </svg>
            </button>
          </a-tooltip>

          <template v-if="state.user">
            <a-dropdown placement="bottomRight" trigger="click">
              <button class="user-menu__trigger" type="button" aria-label="用户菜单">
                <a-avatar v-if="avatarUrl" :size="34" :src="avatarUrl" />
                <a-avatar v-else :size="34" style="background: linear-gradient(135deg, #5145e5, #a78bfa)">
                  {{ initial }}
                </a-avatar>
              </button>
              <template #overlay>
                <a-menu @click="onUserMenu">
                  <a-menu-item key="dashboard">写作工作台</a-menu-item>
                  <a-menu-item key="write">写新文章</a-menu-item>
                  <a-menu-item key="account">账号与密码</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="logout" danger>退出登录</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
          <RouterLink v-else class="btn btn--ghost btn--sm" :to="{ name: 'Login' }">登录</RouterLink>

          <button class="icon-btn icon-btn--menu" type="button" aria-label="打开菜单" @click="drawerOpen = true">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="container site-footer__inner">
        <div class="site-footer__brand">
          <span class="brand__name">{{ site.site_name }}</span>
          <p class="site-footer__tag">{{ site.tagline }}</p>
          <p class="site-footer__note">
            前端 Vue 3 · 后端 Spring Boot 3 · 数据库 MySQL 8，三个模块各自独立。
          </p>
        </div>
        <div class="site-footer__col">
          <span class="site-footer__stack">浏览</span>
          <RouterLink class="drawer__link" :to="{ name: 'Home' }">首页</RouterLink>
          <RouterLink class="drawer__link" :to="{ name: 'ArticleList' }">全部文章</RouterLink>
          <RouterLink class="drawer__link" :to="{ name: 'Tags' }">标签</RouterLink>
          <RouterLink class="drawer__link" :to="{ name: 'About' }">关于</RouterLink>
        </div>
        <div class="site-footer__col">
          <span class="site-footer__stack">作者</span>
          <RouterLink class="drawer__link" :to="{ name: 'Login' }">登录后台</RouterLink>
          <a v-if="site.email" class="drawer__link" :href="`mailto:${site.email}`">{{ site.email }}</a>
          <a v-if="site.github" class="drawer__link" :href="site.github" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
      <div class="container site-footer__bottom">
        <span>© {{ year }} {{ site.author_name }} · 用 Markdown 写下每一次思考</span>
      </div>
    </footer>

    <!-- 移动端导航抽屉 -->
    <a-drawer v-model:open="drawerOpen" placement="right" :width="290" :closable="false" root-class-name="mobile-drawer">
      <template #title>
        <span class="brand__name">{{ site.site_name }}</span>
      </template>
      <nav class="drawer__nav">
        <RouterLink v-for="item in NAV" :key="item.name" class="drawer__link" :to="{ name: item.name }">
          {{ item.label }}
        </RouterLink>
        <RouterLink v-if="state.user" class="drawer__link" :to="{ name: 'Dashboard' }">写作工作台</RouterLink>
        <RouterLink v-else class="drawer__link" :to="{ name: 'Login' }">登录</RouterLink>
      </nav>
      <template #footer>
        <a-button block @click="toggleTheme">{{ isDark ? '切换到浅色' : '切换到深色' }}</a-button>
      </template>
    </a-drawer>
  </div>
</template>

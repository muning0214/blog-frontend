<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const { state, logout } = useUserStore()
const { site } = useSiteSettings()
const { isDark, toggleTheme } = useTheme()

const NAV = [
  { name: 'Dashboard', label: '工作台' },
  { name: 'ArticleEdit', label: '写新文章' },
  { name: 'Account', label: '账号' },
]

const initial = computed(() => {
  const u = state.user
  return (u?.nickname || u?.email || 'U').trim().slice(0, 1).toUpperCase()
})

const onUserMenu = async ({ key }) => {
  if (key === 'site') {
    router.push({ name: 'Home' })
  } else if (key === 'logout') {
    await logout()
    router.push({ name: 'Home' })
  } else {
    router.push({ name: key })
  }
}
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
            <span class="brand__tag">作者后台</span>
          </span>
        </RouterLink>

        <nav class="site-nav" aria-label="后台导航">
          <RouterLink
            v-for="item in NAV"
            :key="item.name"
            class="site-nav__link"
            :class="{ 'is-active': route.name === item.name }"
            :to="{ name: item.name }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="site-header__side">
          <a-button type="text" size="small" @click="router.push({ name: 'Home' })">
            返回前台
          </a-button>
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

          <a-dropdown placement="bottomRight" trigger="click">
            <button class="user-menu__trigger" type="button" aria-label="用户菜单">
              <a-avatar :size="34" style="background: linear-gradient(135deg, #5145e5, #a78bfa)">
                {{ initial }}
              </a-avatar>
            </button>
            <template #overlay>
              <a-menu @click="onUserMenu">
                <a-menu-item key="Dashboard">写作工作台</a-menu-item>
                <a-menu-item key="Account">账号与密码</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="site">返回前台</a-menu-item>
                <a-menu-item key="logout" danger>退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>
  </div>
</template>

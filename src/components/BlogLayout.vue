<template>
  <div class="blog-layout">
    <header class="header">
      <div class="container header-inner">
        <div class="logo" @click="router.push('/')">
          <h1>My Blog</h1>
        </div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          mode="horizontal"
          class="nav-menu"
          :overflowedIndicator="null"
        >
          <a-menu-item key="/" @click="go('/')">首页</a-menu-item>
          <a-menu-item key="/archives" @click="go('/archives')">归档</a-menu-item>
          <a-menu-item key="/categories" @click="go('/categories')">分类</a-menu-item>
          <a-menu-item key="/tags" @click="go('/tags')">标签</a-menu-item>
          <a-menu-item key="/about" @click="go('/about')">关于</a-menu-item>
        </a-menu>
        <div class="header-actions">
          <a-button type="link" @click="go('/admin/dashboard')">后台管理</a-button>
        </div>
        <div class="mobile-toggle" @click="mobileMenuVisible = !mobileMenuVisible">
          <menu-outlined v-if="!mobileMenuVisible" />
          <close-outlined v-else />
        </div>
      </div>
    </header>

    <!-- Mobile dropdown menu -->
    <div v-if="mobileMenuVisible" class="mobile-menu">
      <a-menu v-model:selectedKeys="selectedKeys" mode="vertical" @click="onMobileMenuClick">
        <a-menu-item key="/">首页</a-menu-item>
        <a-menu-item key="/archives">归档</a-menu-item>
        <a-menu-item key="/categories">分类</a-menu-item>
        <a-menu-item key="/tags">标签</a-menu-item>
        <a-menu-item key="/about">关于</a-menu-item>
        <a-menu-item key="/admin/dashboard">后台管理</a-menu-item>
      </a-menu>
    </div>

    <main class="main-content container">
      <router-view />
    </main>

    <footer class="footer">
      <div class="container">
        <p>© {{ year }} My Blog · Powered by Spring Boot 3 + Vue 3</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MenuOutlined, CloseOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const mobileMenuVisible = ref(false)

const year = new Date().getFullYear()

const selectedKeys = ref([route.path])

watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath]
  mobileMenuVisible.value = false
})

function go(path) {
  router.push(path)
}

function onMobileMenuClick({ key }) {
  router.push(key)
  mobileMenuVisible.value = false
}
</script>

<style scoped>
.blog-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  display: flex;
  align-items: center;
  height: 64px;
}

.logo {
  cursor: pointer;
  margin-right: 40px;
  flex-shrink: 0;
}

.logo h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
}

.nav-menu {
  flex: 1;
  border-bottom: none !important;
  line-height: 62px;
}

.header-actions {
  flex-shrink: 0;
}

.mobile-toggle {
  display: none;
  font-size: 20px;
  padding: 8px;
  cursor: pointer;
}

.main-content {
  flex: 1;
  padding: 24px 16px;
  max-width: 1100px;
}

.footer {
  background: #fff;
  text-align: center;
  padding: 24px 0;
  color: #999;
  border-top: 1px solid #f0f0f0;
}

.footer p {
  font-size: 14px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .nav-menu,
  .header-actions {
    display: none;
  }

  .mobile-toggle {
    display: block;
    margin-left: auto;
  }

  .mobile-menu {
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-top: 1px solid #f0f0f0;
  }
}
</style>

<template>
  <a-layout class="admin-layout">
    <!-- Sider -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      breakpoint="lg"
      @breakpoint="onBreakpoint"
      width="220"
      class="admin-sider"
    >
      <div class="logo">
        <span v-if="!collapsed">博客后台</span>
        <span v-else>Blog</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        mode="inline"
        theme="dark"
        @click="onMenuClick"
      >
        <a-menu-item key="/admin/dashboard">
          <dashboard-outlined />
          <span>仪表盘</span>
        </a-menu-item>
        <a-menu-item key="/admin/articles">
          <file-text-outlined />
          <span>文章管理</span>
        </a-menu-item>
        <a-menu-item key="/admin/article/edit">
          <edit-outlined />
          <span>写文章</span>
        </a-menu-item>
        <a-menu-item key="/admin/categories">
          <appstore-outlined />
          <span>分类管理</span>
        </a-menu-item>
        <a-menu-item key="/admin/comments">
          <comment-outlined />
          <span>评论审核</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- Content -->
    <a-layout>
      <a-layout-header class="admin-header">
        <div class="header-left">
          <component
            :is="collapsed ? MenuUnfoldOutlined : MenuFoldOutlined"
            class="trigger"
            @click="collapsed = !collapsed"
          />
        </div>
        <div class="header-right">
          <a-dropdown>
            <div class="user-info">
              <a-avatar style="background-color: #1677ff;">
                {{ userInfo?.nickname?.charAt(0) || 'A' }}
              </a-avatar>
              <span class="username">{{ userInfo?.nickname || userInfo?.username || 'Admin' }}</span>
            </div>
            <template #overlay>
              <a-menu @click="onUserMenuClick">
                <a-menu-item key="blog">
                  <link-outlined />
                  访问前台
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout">
                  <logout-outlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <a-layout-content class="admin-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import {
  DashboardOutlined,
  FileTextOutlined,
  EditOutlined,
  AppstoreOutlined,
  CommentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LinkOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue'
import { useUserStore } from '@/store/user'

const route = useRoute()
const router = useRouter()
const { state, logout } = useUserStore()

const collapsed = ref(false)
const userInfo = computed(() => state.userInfo)

const selectedKeys = ref([route.path])
const openKeys = ref([])

watch(() => route.path, (newPath) => {
  // Normalize edit path
  if (newPath.startsWith('/admin/article/edit')) {
    selectedKeys.value = ['/admin/article/edit']
  } else {
    selectedKeys.value = [newPath]
  }
}, { immediate: true })

function onMenuClick({ key }) {
  router.push(key)
}

function onUserMenuClick({ key }) {
  if (key === 'blog') {
    router.push('/')
  } else if (key === 'logout') {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      onOk() {
        logout()
        router.push('/login')
      }
    })
  }
}

function onBreakpoint(broken) {
  collapsed.value = broken
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.admin-sider {
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  height: 64px;
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
}

.trigger:hover {
  color: #1677ff;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 0 12px;
}

.username {
  font-size: 14px;
  color: #333;
}

.admin-content {
  margin: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  min-height: 360px;
  overflow-x: auto;
}
</style>

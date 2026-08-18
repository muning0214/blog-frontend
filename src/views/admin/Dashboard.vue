<template>
  <div class="dashboard">
    <h2 class="page-title">仪表盘</h2>
    <div v-if="loading" class="loading"><a-spin size="large" /></div>
    <div v-else>
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-card class="stat-card">
            <a-statistic title="文章总数" :value="stats.articleCount" suffix="篇">
              <template #prefix><file-text-outlined style="color: #1677ff" /></template>
            </a-statistic>
            <p class="stat-sub">已发布 {{ stats.publishedCount }} 篇</p>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-card class="stat-card">
            <a-statistic title="总浏览量" :value="stats.totalViews" suffix="次">
              <template #prefix><eye-outlined style="color: #52c41a" /></template>
            </a-statistic>
            <p class="stat-sub">全部文章累计</p>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-card class="stat-card">
            <a-statistic title="评论总数" :value="stats.commentCount" suffix="条">
              <template #prefix><comment-outlined style="color: #faad14" /></template>
            </a-statistic>
            <p class="stat-sub">待审核 {{ stats.pendingCommentCount }} 条</p>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-card class="stat-card">
            <a-statistic title="分类/标签" :value="stats.categoryCount" suffix="分类">
              <template #prefix><appstore-outlined style="color: #722ed1" /></template>
            </a-statistic>
            <p class="stat-sub">标签 {{ stats.tagCount }} 个</p>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="快捷操作">
            <a-space wrap>
              <a-button type="primary" @click="router.push('/admin/article/edit')">
                <template #icon><edit-outlined /></template>
                写文章
              </a-button>
              <a-button @click="router.push('/admin/articles')">
                <template #icon><file-text-outlined /></template>
                管理文章
              </a-button>
              <a-button @click="router.push('/admin/categories')">
                <template #icon><appstore-outlined /></template>
                管理分类
              </a-button>
              <a-button @click="router.push('/admin/comments')">
                <template #icon><comment-outlined /></template>
                审核评论
              </a-button>
            </a-space>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  FileTextOutlined,
  EyeOutlined,
  CommentOutlined,
  AppstoreOutlined,
  EditOutlined
} from '@ant-design/icons-vue'
import { getStats } from '@/api/dashboard'

const router = useRouter()
const loading = ref(true)
const stats = ref({})

async function loadStats() {
  loading.value = true
  try {
    const res = await getStats()
    stats.value = res.data || {}
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.page-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 60px 0;
}

.stat-card {
  height: 100%;
}

.stat-sub {
  margin-top: 8px;
  font-size: 13px;
  color: #999;
  margin-bottom: 0;
}
</style>

<template>
  <div class="article-detail">
    <div v-if="loading" class="loading">
      <a-spin size="large" />
    </div>
    <template v-else-if="article">
      <a-card class="article-card">
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <span><user-outlined /> {{ article.authorName || '佚名' }}</span>
          <span><calendar-outlined /> {{ formatDate(article.createTime) }}</span>
          <span v-if="article.categoryName"><folder-outlined /> {{ article.categoryName }}</span>
          <span><eye-outlined /> {{ article.viewCount }} 阅读</span>
          <template v-if="article.tagNames">
            <a-tag v-for="tag in article.tagNames.split(',')" :key="tag" color="blue">
              {{ tag }}
            </a-tag>
          </template>
        </div>
        <a-divider />
        <div class="markdown-body" v-html="renderedContent"></div>
      </a-card>

      <!-- Comments section -->
      <a-card class="comment-section" title="评论区">
        <div class="comment-form">
          <a-textarea
            v-model:value="commentForm.content"
            placeholder="写下你的评论..."
            :rows="3"
            :maxlength="1000"
            show-count
          />
          <div class="comment-form-bottom">
            <a-input
              v-model:value="commentForm.nickname"
              placeholder="昵称"
              style="width: 180px; margin-right: 12px;"
            />
            <a-input
              v-model:value="commentForm.email"
              placeholder="邮箱（选填）"
              style="width: 220px; margin-right: 12px;"
            />
            <a-button type="primary" :loading="submitting" @click="submitComment">发表评论</a-button>
          </div>
        </div>

        <a-divider />

        <div v-if="comments.length === 0" class="no-comments">
          <a-empty description="暂无评论，快来抢沙发~" />
        </div>
        <div v-else class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <a-avatar :size="36">{{ comment.nickname?.charAt(0) }}</a-avatar>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-name">{{ comment.nickname }}</span>
                <span class="comment-time">{{ formatDate(comment.createTime) }}</span>
              </div>
              <p class="comment-content">{{ comment.content }}</p>
              <!-- Reply children -->
              <div v-if="comment.children && comment.children.length" class="comment-replies">
                <div v-for="reply in comment.children" :key="reply.id" class="comment-item reply">
                  <a-avatar :size="28">{{ reply.nickname?.charAt(0) }}</a-avatar>
                  <div class="comment-body">
                    <div class="comment-header">
                      <span class="comment-name">{{ reply.nickname }}</span>
                      <span class="comment-time">{{ formatDate(reply.createTime) }}</span>
                    </div>
                    <p class="comment-content">{{ reply.content }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  CalendarOutlined,
  FolderOutlined,
  EyeOutlined
} from '@ant-design/icons-vue'
import { marked } from 'marked'
import dayjs from 'dayjs'
import { getArticleDetail } from '@/api/article'
import { getComments, submitComment as submitCommentApi } from '@/api/comment'

const route = useRoute()
const loading = ref(true)
const article = ref(null)
const comments = ref([])
const submitting = ref(false)

const commentForm = ref({
  content: '',
  nickname: '',
  email: '',
  parentId: 0
})

const renderedContent = computed(() => {
  if (!article.value?.content) return ''
  return marked.parse(article.value.content)
})

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : ''
}

async function loadArticle() {
  loading.value = true
  try {
    const res = await getArticleDetail(route.params.id)
    article.value = res.data
    await loadComments()
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  const res = await getComments(route.params.id)
  comments.value = res.data || []
}

async function submitComment() {
  if (!commentForm.value.content.trim()) {
    message.warning('请输入评论内容')
    return
  }
  if (!commentForm.value.nickname.trim()) {
    message.warning('请输入昵称')
    return
  }
  submitting.value = true
  try {
    await submitCommentApi({
      articleId: Number(route.params.id),
      nickname: commentForm.value.nickname,
      email: commentForm.value.email,
      content: commentForm.value.content,
      parentId: commentForm.value.parentId
    })
    message.success('评论提交成功，待管理员审核后显示')
    commentForm.value.content = ''
    await loadComments()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadArticle()
})
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 80px 0;
}

.article-card {
  margin-bottom: 24px;
}

.article-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  color: #999;
  font-size: 14px;
}

.article-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.comment-section {
  margin-bottom: 24px;
}

.comment-form {
  margin-bottom: 16px;
}

.comment-form-bottom {
  display: flex;
  align-items: center;
  margin-top: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.comment-list {
  margin-top: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-body {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.comment-name {
  font-weight: 600;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #bbb;
}

.comment-content {
  color: #555;
  line-height: 1.6;
  margin: 0;
}

.comment-replies {
  margin-top: 12px;
  padding-left: 12px;
  border-left: 3px solid #f0f0f0;
}

.comment-item.reply {
  padding: 10px 0;
}

@media (max-width: 768px) {
  .article-title {
    font-size: 22px;
  }

  .article-meta {
    gap: 10px;
    font-size: 12px;
  }

  .comment-form-bottom {
    flex-direction: column;
    align-items: stretch;
  }

  .comment-form-bottom :deep(.ant-input) {
    width: 100% !important;
  }
}
</style>

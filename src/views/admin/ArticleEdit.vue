<template>
  <div class="article-edit">
    <div class="header-row">
      <h2 class="page-title">{{ isEdit ? '编辑文章' : '写文章' }}</h2>
      <a-button @click="router.back()">返回</a-button>
    </div>

    <a-spin :spinning="loading">
      <a-form layout="vertical" :model="form" class="edit-form">
        <a-row :gutter="24">
          <a-col :span="24" :md="17">
            <a-form-item label="标题" name="title" :rules="[{ required: true, message: '请输入标题' }]">
              <a-input v-model:value="form.title" placeholder="请输入文章标题" size="large" />
            </a-form-item>

            <a-form-item label="摘要">
              <a-textarea
                v-model:value="form.summary"
                placeholder="请输入文章摘要"
                :rows="3"
                :maxlength="500"
                show-count
              />
            </a-form-item>

            <a-form-item label="封面图">
              <a-input v-model:value="form.cover" placeholder="请输入封面图URL" />
            </a-form-item>

            <a-form-item label="内容" name="content" :rules="[{ required: true, message: '请输入内容' }]">
              <div class="toolbar">
                <a-space>
                  <a-button size="small" @click="insertMarkdown('# ')">H1</a-button>
                  <a-button size="small" @click="insertMarkdown('## ')">H2</a-button>
                  <a-button size="small" @click="insertMarkdown('- ')">列表</a-button>
                  <a-button size="small" @click="insertMarkdown('**加粗**')">加粗</a-button>
                  <a-button size="small" @click="insertMarkdown('`代码`')">代码</a-button>
                </a-space>
              </div>
              <a-textarea
                v-model:value="form.content"
                ref="contentRef"
                placeholder="支持 Markdown 语法，请输入文章内容"
                :rows="18"
                class="content-editor"
              />
            </a-form-item>
          </a-col>

          <a-col :span="24" :md="7">
            <a-card title="发布设置" class="settings-card">
              <a-form-item label="分类">
                <a-select
                  v-model:value="form.categoryId"
                  placeholder="选择分类"
                  allow-clear
                >
                  <a-select-option v-for="c in categories" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="标签">
                <a-select
                  v-model:value="form.tagIds"
                  mode="multiple"
                  placeholder="选择标签"
                  allow-clear
                >
                  <a-select-option v-for="t in tags" :key="t.id" :value="t.id">
                    {{ t.name }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="状态">
                <a-radio-group v-model:value="form.status">
                  <a-radio :value="1">发布</a-radio>
                  <a-radio :value="0">草稿</a-radio>
                </a-radio-group>
              </a-form-item>

              <a-form-item label="置顶">
                <a-switch v-model:checked="topChecked" />
              </a-form-item>

              <a-divider />

              <div class="action-buttons">
                <a-space direction="vertical" style="width: 100%;">
                  <a-button
                    type="primary"
                    block
                    size="large"
                    :loading="saving"
                    @click="handleSave"
                  >
                    {{ isEdit ? '保存修改' : '发布文章' }}
                  </a-button>
                  <a-button block size="large" @click="handleSaveDraft" :loading="saving">
                    存为草稿
                  </a-button>
                </a-space>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-form>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAdminArticleDetail, createArticle, updateArticle } from '@/api/article'
import { getAdminCategories } from '@/api/category'
import { getAdminTags } from '@/api/tag'

const route = useRoute()
const router = useRouter()

const articleId = computed(() => route.params.id)
const isEdit = computed(() => !!articleId.value)
const loading = ref(false)
const saving = ref(false)

const categories = ref([])
const tags = ref([])

const form = reactive({
  title: '',
  summary: '',
  content: '',
  cover: '',
  categoryId: undefined,
  tagIds: [],
  status: 1,
  isTop: 0
})

const topChecked = computed({
  get: () => form.isTop === 1,
  set: (val) => { form.isTop = val ? 1 : 0 }
})

const contentRef = ref(null)

function insertMarkdown(prefix) {
  const el = document.querySelector('.content-editor textarea')
  if (el) {
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = form.content
    form.content = text.substring(0, start) + prefix + text.substring(end)
    el.focus()
    el.setSelectionRange(start + prefix.length, start + prefix.length)
  } else {
    form.content += prefix
  }
}

async function loadData() {
  loading.value = true
  try {
    const [catRes, tagRes] = await Promise.all([getAdminCategories(), getAdminTags()])
    categories.value = catRes.data || []
    tags.value = tagRes.data || []

    if (isEdit.value) {
      const res = await getAdminArticleDetail(articleId.value)
      const data = res.data
      form.title = data.title
      form.summary = data.summary || ''
      form.content = data.content || ''
      form.cover = data.cover || ''
      form.categoryId = data.categoryId
      form.status = data.status
      form.isTop = data.isTop || 0
      // Load tag ids from the article's tagNames -> resolve to ids
      if (data.tagNames) {
        const names = data.tagNames.split(',').map(n => n.trim())
        form.tagIds = tags.value
          .filter(t => names.includes(t.name))
          .map(t => t.id)
      }
    }
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!form.title.trim()) {
    message.warning('请输入标题')
    return
  }
  if (!form.content.trim()) {
    message.warning('请输入内容')
    return
  }
  saving.value = true
  try {
    const payload = { ...form }
    if (isEdit.value) {
      await updateArticle(articleId.value, payload)
      message.success('保存成功')
    } else {
      payload.status = 1
      await createArticle(payload)
      message.success('发布成功')
    }
    router.push('/admin/articles')
  } catch (e) {
    // handled by interceptor
  } finally {
    saving.value = false
  }
}

async function handleSaveDraft() {
  if (!form.title.trim()) {
    message.warning('请输入标题')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, status: 0 }
    if (isEdit.value) {
      await updateArticle(articleId.value, payload)
      message.success('草稿已保存')
    } else {
      await createArticle(payload)
      message.success('草稿已保存')
    }
    router.push('/admin/articles')
  } catch (e) {
    // handled by interceptor
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
}

.toolbar {
  margin-bottom: 8px;
}

.content-editor textarea {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 14px;
}

.settings-card {
  position: sticky;
  top: 16px;
}

.action-buttons {
  width: 100%;
}
</style>

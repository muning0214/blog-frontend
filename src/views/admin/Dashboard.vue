<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { deleteArticle, fetchMyArticles, fetchPublishedArticles } from '@/api/article'
import {
  createTag,
  deleteTag,
  fetchAuthorTags,
  fetchTagCounts,
  updateTag,
} from '@/api/tag'
import { fetchSettings, saveSettings } from '@/api/settings'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import ArticleRow from '@/components/ArticleRow.vue'
import PageState from '@/components/PageState.vue'
import { formatCount } from '@/utils/format'

const { site, reload: reloadSite } = useSiteSettings()
useDocumentTitle(computed(() => `工作台 · ${site.value.site_name}`))

const activeTab = ref('articles')
const loading = ref(true)
const error = ref('')
const mine = ref([])
const publishedTotal = ref(0)
const tagCounts = ref({})
const tags = ref([])

const stats = computed(() => {
  const drafts = mine.value.filter((a) => a.status === 'draft').length
  const views = mine.value.reduce((sum, a) => sum + (a.views || 0), 0)
  return {
    total: publishedTotal.value,
    mineCount: mine.value.length,
    drafts,
    views,
    tags: tags.value.length,
  }
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [myList, page, tagList, counts] = await Promise.all([
      fetchMyArticles(),
      fetchPublishedArticles({ pageSize: 1 }),
      fetchAuthorTags(),
      fetchTagCounts().catch(() => []),
    ])
    mine.value = myList
    publishedTotal.value = page.total
    tags.value = tagList
    const map = {}
    counts.forEach((t) => (map[t.tag] = t.article_count))
    tagCounts.value = map
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

/* ---------------- 文章管理 ---------------- */
const removing = ref(false)
const confirmDelete = (article) => {
  Modal.confirm({
    title: '删除这篇文章？',
    content: `「${article.title}」会被逻辑删除，引用到的图片与附件也会一并清理，无法恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      removing.value = true
      try {
        await deleteArticle(article.id)
        message.success('已删除')
        await load()
      } catch (e) {
        message.error(e?.message || '删除失败')
      } finally {
        removing.value = false
      }
    },
  })
}

/* ---------------- 站点设置 ---------------- */
const settingsForm = reactive({
  site_name: '',
  tagline: '',
  author_name: '',
  author_bio: '',
  email: '',
  github: '',
  about_md: '',
})
const settingsBusy = ref(false)
const settingsDirty = ref(false)

const fillSettings = () => {
  Object.assign(settingsForm, {
    site_name: site.value.site_name,
    tagline: site.value.tagline,
    author_name: site.value.author_name,
    author_bio: site.value.author_bio,
    email: site.value.email,
    github: site.value.github,
    about_md: site.value.about_md,
  })
}

// 站点配置是异步来的，到位之后再把表单填上（只填一次，之后以用户的编辑为准）
let settingsFilled = false
watch(
  () => site.value.raw,
  (value) => {
    if (value !== undefined && !settingsFilled) {
      fillSettings()
      settingsFilled = true
    }
  },
  { immediate: true },
)

// 用户一改就标记为未保存
watch(settingsForm, () => {
  if (settingsFilled) settingsDirty.value = true
})

const saveSettingsForm = async () => {
  settingsBusy.value = true
  try {
    await saveSettings({ ...settingsForm })
    message.success('站点信息已保存')
    settingsDirty.value = false
    await reloadSite()
    fillSettings()  } catch (e) {
    message.error(e?.message || '保存失败')
  } finally {
    settingsBusy.value = false
  }
}

/* ---------------- 标签管理 ---------------- */
const tagForm = reactive({ name: '', slug: '', description: '', color: '#5145e5' })
const tagBusy = ref(false)
const editingTag = ref(null)
const editOpen = ref(false)
const editForm = reactive({ name: '', description: '', color: '' })

const createTagSubmit = async () => {
  if (!tagForm.name.trim()) {
    message.warning('请填写标签名')
    return
  }
  tagBusy.value = true
  try {
    await createTag({
      name: tagForm.name.trim(),
      slug: tagForm.slug.trim() || undefined,
      description: tagForm.description.trim() || undefined,
      color: tagForm.color,
    })
    message.success(`标签「${tagForm.name.trim()}」已创建`)
    Object.assign(tagForm, { name: '', slug: '', description: '', color: '#5145e5' })
    await load()
  } catch (e) {
    message.error(e?.message || '创建失败')
  } finally {
    tagBusy.value = false
  }
}

const openEdit = (tag) => {
  editingTag.value = tag
  Object.assign(editForm, { name: tag.name, description: tag.description || '', color: tag.color })
  editOpen.value = true
}

const submitEdit = async () => {
  if (!editForm.name.trim()) {
    message.warning('标签名不能为空')
    return
  }
  try {
    await updateTag(editingTag.value.id, { ...editForm, name: editForm.name.trim() })
    message.success('已更新')
    editingTag.value = null
    editOpen.value = false
    await load()
  } catch (e) {
    message.error(e?.message || '更新失败')
  }
}

const removeTag = (tag) => {
  Modal.confirm({
    title: '删除这个标签？',
    content: `「${tag.name}」会从所有文章上移除。文章里保留的同名标签会在有新文章使用时自动重建。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteTag(tag.id)
        message.success('已删除')
        await load()
      } catch (e) {
        message.error(e?.message || '删除失败')
      }
    },
  })
}
</script>

<template>
  <div class="container section">
    <header class="page-head page-head--row">
      <div>
        <h1 class="page-head__title">工作台</h1>
        <p class="page-head__sub">管理你写的文章、站点信息与标签</p>
      </div>
      <RouterLink class="btn btn--primary" :to="{ name: 'ArticleEdit' }">写新文章</RouterLink>
    </header>

    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-card__label">站内已发布</span>
        <strong class="stat-card__value">{{ stats.total }}</strong>
        <span class="stat-card__hint">全站所有作者</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">我的文章</span>
        <strong class="stat-card__value">{{ stats.mineCount }}</strong>
        <span class="stat-card__hint">其中草稿 {{ stats.drafts }} 篇</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">我的总阅读</span>
        <strong class="stat-card__value">{{ formatCount(stats.views) }}</strong>
        <span class="stat-card__hint">按文章累计</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">标签数</span>
        <strong class="stat-card__value">{{ stats.tags }}</strong>
        <span class="stat-card__hint">含未被使用的</span>
      </div>
    </div>

    <PageState :loading="loading" :error="error" loading-label="正在读取工作台…">
      <a-tabs v-model:activeKey="activeTab">
        <!-- 文章管理 -->
        <a-tab-pane key="articles" tab="文章管理">
          <div v-if="mine.length" class="row-list">
            <ArticleRow v-for="article in mine" :key="article.id" :article="article">
              <template #actions>
                <RouterLink
                  class="btn btn--sm btn--ghost"
                  :to="{ name: 'ArticleEdit', params: { id: article.id } }"
                >
                  编辑
                </RouterLink>
                <RouterLink
                  class="btn btn--sm btn--ghost"
                  :to="{ name: 'ArticleDetail', params: { slug: article.slug } }"
                >
                  查看
                </RouterLink>
                <button
                  class="btn btn--sm btn--danger-ghost"
                  type="button"
                  :disabled="removing"
                  @click="confirmDelete(article)"
                >
                  删除
                </button>
              </template>
            </ArticleRow>
          </div>
          <div v-else class="state-block state-block--empty">
            <a-empty description="还没有写过文章" />
            <div class="state-block__action-row">
              <RouterLink class="btn btn--primary" :to="{ name: 'ArticleEdit' }">写第一篇</RouterLink>
            </div>
          </div>
        </a-tab-pane>

        <!-- 站点设置 -->
        <a-tab-pane key="settings" tab="站点设置">
          <div class="panel-form">
            <h3 class="dashboard-section__title">站点信息</h3>
            <div class="form-grid">
              <div class="field">
                <label class="field__label">站点名称 <span class="field__req">*</span></label>
                <a-input v-model:value="settingsForm.site_name" :maxlength="60" />
              </div>
              <div class="field">
                <label class="field__label">副标题</label>
                <a-input v-model:value="settingsForm.tagline" :maxlength="120" />
              </div>
              <div class="field">
                <label class="field__label">作者名</label>
                <a-input v-model:value="settingsForm.author_name" :maxlength="60" />
              </div>
              <div class="field">
                <label class="field__label">联系邮箱</label>
                <a-input v-model:value="settingsForm.email" :maxlength="120" />
              </div>
              <div class="field">
                <label class="field__label">GitHub 地址</label>
                <a-input v-model:value="settingsForm.github" :maxlength="255" placeholder="https://github.com/…" />
              </div>
              <div class="field">
                <label class="field__label">一句话简介</label>
                <a-input v-model:value="settingsForm.author_bio" :maxlength="300" />
              </div>
            </div>

            <h3 class="dashboard-section__title">关于页（Markdown）</h3>
            <textarea
              v-model="settingsForm.about_md"
              class="code-textarea"
              rows="12"
              spellcheck="false"
              placeholder="## 关于这个博客&#10;&#10;这里会渲染成关于页的正文。"
            />

            <div class="panel-form__actions">
              <span class="save-state" :class="{ 'save-state--dirty': settingsDirty }">
                {{ settingsDirty ? '有未保存的修改' : '与线上一致' }}
              </span>
              <a-button type="primary" :loading="settingsBusy" @click="saveSettingsForm">保存站点信息</a-button>
            </div>
          </div>
        </a-tab-pane>

        <!-- 标签管理 -->
        <a-tab-pane key="tags" tab="标签管理">
          <form class="tag-create" @submit.prevent="createTagSubmit">
            <div class="field">
              <label class="field__label">标签名 <span class="field__req">*</span></label>
              <a-input v-model:value="tagForm.name" :maxlength="60" placeholder="例如：Vue" />
            </div>
            <div class="field">
              <label class="field__label">标识</label>
              <a-input v-model:value="tagForm.slug" :maxlength="60" placeholder="留空则自动生成" />
            </div>
            <div class="field">
              <label class="field__label">描述</label>
              <a-input v-model:value="tagForm.description" :maxlength="300" />
            </div>
            <div class="field">
              <label class="field__label">颜色</label>
              <input v-model="tagForm.color" type="color" class="tag-color-input" />
            </div>
            <div class="field">
              <label class="field__label">&nbsp;</label>
              <a-button type="primary" :loading="tagBusy" html-type="submit">创建标签</a-button>
            </div>
          </form>

          <table class="tag-table tag-table--manage">
            <thead>
              <tr class="tag-table__head">
                <th>标签</th>
                <th class="tag-table__count">文章数</th>
                <th class="tag-table__date">创建时间</th>
                <th class="tag-table__ops">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tag in tags" :key="tag.id" class="tag-table__row">
                <td>
                  <span class="tag-chip" :style="{ '--tag-color': tag.color }">
                    <span class="tag-pill__dot" />{{ tag.name }}
                  </span>
                  <code v-if="tag.slug" class="path-chip">{{ tag.slug }}</code>
                </td>
                <td class="tag-table__count">{{ tagCounts[tag.slug] || 0 }}</td>
                <td class="tag-table__date">{{ tag.created_at?.slice(0, 10) || '—' }}</td>
                <td class="tag-table__ops">
                  <button class="btn btn--sm btn--ghost" type="button" @click="openEdit(tag)">编辑</button>
                  <button class="btn btn--sm btn--danger-ghost" type="button" @click="removeTag(tag)">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </a-tab-pane>
      </a-tabs>
    </PageState>

    <!-- 编辑标签 -->
    <a-modal v-model:open="editOpen" title="编辑标签" @ok="submitEdit">
      <div class="field">
        <label class="field__label">标签名 <span class="field__req">*</span></label>
        <a-input v-model:value="editForm.name" :maxlength="60" />
      </div>
      <div class="field">
        <label class="field__label">描述</label>
        <a-input v-model:value="editForm.description" :maxlength="300" />
      </div>
      <div class="field">
        <label class="field__label">颜色</label>
        <input v-model="editForm.color" type="color" class="tag-color-input" />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
/* 原生颜色选择器在不同浏览器里高度不一致，这里统一成与输入框同高 */
.tag-color-input {
  width: 100%;
  height: 32px;
  padding: 2px 4px;
  border: 1px solid var(--border, #e7e9ef);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
</style>

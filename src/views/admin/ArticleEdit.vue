<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { createArticle, fetchMyArticleById, updateArticle } from '@/api/article'
import { uploadFile } from '@/api/file'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import MarkdownView from '@/components/MarkdownView.vue'
import CoverImage from '@/components/CoverImage.vue'
import PageState from '@/components/PageState.vue'
import { estimateReadingMinutes, formatBytes, slugify } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { site } = useSiteSettings()

const articleId = computed(() => (route.params.id ? Number(route.params.id) : null))
useDocumentTitle(computed(() => (articleId.value ? `编辑文章 · ${site.value.site_name}` : `写新文章 · ${site.value.site_name}`)))

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  content: '',
  cover_path: '',
  status: 'draft',
  featured: false,
  tags: [],
  attachments: [],
})

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const dirty = ref(false)
const slugTouched = ref(false)
const previewMode = ref(false)
const contentEl = ref(null)
const coverInput = ref(null)
const imageInput = ref(null)
const attachInput = ref(null)
const uploading = ref('')

/** 编辑已有文章时，正文里的 /uploads 引用与封面记录下来，保存失败时可提示 */
const original = ref(null)

const readingMinutes = computed(() => estimateReadingMinutes(form.content))
const saveState = computed(() => (saving.value ? '保存中…' : dirty.value ? '有未保存的修改' : '已保存'))

/* ------------------------------------------------------------------ */
/* 加载                                                                */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  if (!articleId.value) {
    loading.value = false
    return
  }
  try {
    const data = await fetchMyArticleById(articleId.value)
    Object.assign(form, {
      title: data.title || '',
      slug: data.slug || '',
      summary: data.summary || '',
      content: data.content || '',
      cover_path: data.cover_path || '',
      status: data.status || 'draft',
      featured: !!data.featured,
      tags: [...(data.tags || [])],
      attachments: [...(data.attachments || [])],
    })
    original.value = data
    slugTouched.value = true
  } catch (e) {
    error.value = e?.message || '文章加载失败'
  } finally {
    loading.value = false
  }
})

/* 标题变化时自动补 slug，但用户一旦手改就不再覆盖 */
watch(
  () => form.title,
  (title) => {
    if (!slugTouched.value) form.slug = slugify(title)
  },
)
watch(form, () => (dirty.value = true))

/* ------------------------------------------------------------------ */
/* 工具栏：在光标处插入 Markdown 语法                                   */
/* ------------------------------------------------------------------ */

const insertAtCursor = (before, after = '', placeholder = '') => {
  const el = contentEl.value
  if (!el) return
  const start = el.selectionStart ?? form.content.length
  const end = el.selectionEnd ?? start
  const selected = form.content.slice(start, end) || placeholder
  form.content = form.content.slice(0, start) + before + selected + after + form.content.slice(end)
  dirty.value = true
  nextTick(() => {
    el.focus()
    const pos = start + before.length + selected.length
    el.setSelectionRange(pos, pos)
  })
}

const TOOLS = [
  { label: 'H', title: '二级标题', wrap: ['\n## ', '\n'], ph: '标题' },
  { label: 'B', title: '加粗', wrap: ['**', '**'], ph: '加粗文字' },
  { label: 'I', title: '斜体', wrap: ['*', '*'], ph: '斜体文字' },
  { label: '❝', title: '引用', wrap: ['\n> ', '\n'], ph: '引用内容' },
  { label: '•', title: '列表', wrap: ['\n- ', '\n'], ph: '列表项' },
  { label: '</>', title: '代码块', wrap: ['\n```ts\n', '\n```\n'], ph: 'const a = 1' },
  { label: '🔗', title: '链接', wrap: ['[', '](https://)'], ph: '链接文字' },
]

/* ------------------------------------------------------------------ */
/* 上传                                                                */
/* ------------------------------------------------------------------ */

const pickFile = (inputRef) => inputRef.value?.click()

const onCoverChange = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = 'cover'
  try {
    const res = await uploadFile(file, 'covers')
    form.cover_path = res.path
    dirty.value = true
    message.success('封面上传成功')
  } catch (e) {
    message.error(e?.message || '封面上传失败')
  } finally {
    uploading.value = ''
  }
}

const removeCover = () => {
  form.cover_path = ''
  dirty.value = true
}

/** 插入正文插图：直接把可访问地址写进 Markdown，浏览器自己解析 */
const onImageChange = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = 'image'
  try {
    const res = await uploadFile(file, 'images')
    const alt = file.name.replace(/\.[^.]+$/, '')
    insertAtCursor(`\n![${alt}](${res.url})\n`)
    message.success('插图已插入正文')
  } catch (e) {
    message.error(e?.message || '插图上传失败')
  } finally {
    uploading.value = ''
  }
}

const onAttachChange = async (event) => {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return
  uploading.value = 'attach'
  try {
    for (const file of files) {
      const res = await uploadFile(file, 'attachments')
      form.attachments.push({ name: res.name, path: res.path, size: res.size, mime: res.mime })
    }
    dirty.value = true
    message.success('附件上传成功')
  } catch (e) {
    message.error(e?.message || '附件上传失败')
  } finally {
    uploading.value = ''
  }
}

const removeAttachment = (item) => {
  form.attachments = form.attachments.filter((a) => a.path !== item.path)
  dirty.value = true
}

/* ------------------------------------------------------------------ */
/* 标签                                                                */
/* ------------------------------------------------------------------ */

const tagInput = ref('')
const addTag = () => {
  const value = tagInput.value.trim()
  if (!value) return
  if (form.tags.includes(value)) {
    message.warning('这个标签已经在列表里了')
    tagInput.value = ''
    return
  }
  form.tags.push(value)
  tagInput.value = ''
  dirty.value = true
}
const removeTagAt = (index) => {
  form.tags.splice(index, 1)
  dirty.value = true
}

/* ------------------------------------------------------------------ */
/* 保存                                                                */
/* ------------------------------------------------------------------ */

const save = async (status) => {
  if (!form.title.trim()) {
    message.warning('请先填写标题')
    return
  }
  if (!form.content.trim()) {
    message.warning('正文不能为空')
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      summary: form.summary.trim() || undefined,
      content: form.content,
      // 字段名必须是 snake_case：后端开了 Jackson 的 SNAKE_CASE 策略，
      // 反序列化也按 snake_case 匹配，写成 coverPath 会被静默丢弃 ——
      // 表现是「封面上传成功了，保存后却没了」。
      cover_path: form.cover_path || undefined,
      tags: form.tags,
      attachments: form.attachments,
      status: status || form.status,
      featured: form.featured,
    }
    const saved = articleId.value
      ? await updateArticle(articleId.value, payload)
      : await createArticle(payload)
    dirty.value = false
    message.success(saved.status === 'published' ? '已发布' : '已保存为草稿')
    // 新建成功后把地址换成编辑态，刷新也不会丢
    if (!articleId.value) {
      router.replace({ name: 'ArticleEdit', params: { id: saved.id } })
    }
  } catch (e) {
    error.value = e?.message || '保存失败'
    message.error(error.value)
  } finally {
    saving.value = false
  }
}

const confirmLeaveIfDirty = (next) => {
  if (!dirty.value) return true
  Modal.confirm({
    title: '还有未保存的修改',
    content: '离开当前页面会丢失这些修改。',
    okText: '放弃修改并离开',
    okType: 'danger',
    cancelText: '继续编辑',
    onOk: () => {
      dirty.value = false
      router.push(next)
    },
  })
  return false
}
</script>

<template>
  <div class="container section editor-grid">
    <PageState :loading="loading" :error="error" loading-label="正在读取文章…">
      <header class="editor-head">
        <div class="editor-head__left">
          <input
            v-model="form.title"
            class="editor-title"
            type="text"
            placeholder="文章标题…"
            :maxlength="200"
          />
          <div class="editor-subrow">
            <span class="editor-slug">
              <code>/article/</code>
              <input
                v-model="form.slug"
                type="text"
                placeholder="url-slug"
                :maxlength="160"
                @input="slugTouched = true"
              />
            </span>
            <span class="editor-count">约 {{ readingMinutes }} 分钟阅读</span>
          </div>
        </div>
        <div class="editor-head__right">
          <span class="save-state" :class="{ 'save-state--dirty': dirty }">{{ saveState }}</span>
          <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'Dashboard' }">返回工作台</RouterLink>
          <a-button :loading="saving" @click="save('draft')">存为草稿</a-button>
          <a-button type="primary" :loading="saving" @click="save('published')">发布</a-button>
        </div>
      </header>

      <div class="editor-main">
        <div class="editor-toolbar">
          <div class="editor-toolbar__group">
            <button
              v-for="tool in TOOLS"
              :key="tool.label"
              class="tool-btn"
              type="button"
              :title="tool.title"
              @click="insertAtCursor(tool.wrap[0], tool.wrap[1], tool.ph)"
            >
              {{ tool.label }}
            </button>
          </div>
          <div class="editor-toolbar__group">
            <button
              class="tool-btn"
              type="button"
              title="上传并插入插图"
              :disabled="uploading === 'image'"
              @click="pickFile(imageInput)"
            >
              {{ uploading === 'image' ? '上传中…' : '插图' }}
            </button>
            <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden @change="onImageChange" />
            <button class="tool-btn" type="button" @click="previewMode = !previewMode">
              {{ previewMode ? '编辑' : '预览' }}
            </button>
          </div>
        </div>

        <div class="editor-panes" :class="{ 'editor-panes--split': previewMode }">
          <textarea
            ref="contentEl"
            v-model="form.content"
            class="editor-textarea"
            spellcheck="false"
            placeholder="用 Markdown 写正文…"
          />
          <div class="editor-preview">
            <span class="editor-preview__label">预览</span>
            <MarkdownView v-if="previewMode" :markdown="form.content" />
            <div v-else class="editor-preview__empty">点右上角「预览」查看渲染效果</div>
          </div>
        </div>
      </div>

      <aside class="editor-side">
        <div class="side-panel">
          <h3 class="side-panel__title">发布设置</h3>
          <div class="field">
            <label class="field__label">状态</label>
            <a-select v-model:value="form.status" style="width: 100%">
              <a-select-option value="draft">草稿（只有你能看到）</a-select-option>
              <a-select-option value="published">已发布</a-select-option>
            </a-select>
          </div>
          <div class="field">
            <label class="field__label">首页精选</label>
            <a-switch v-model:checked="form.featured" />
          </div>
          <div class="field">
            <label class="field__label">摘要</label>
            <a-input v-model:value="form.summary" :maxlength="500" placeholder="留空则自动截取正文开头" />
          </div>
          <div class="field">
            <label class="field__label">标签</label>
            <div class="tag-editor">
              <div class="tag-input">
                <input
                  v-model="tagInput"
                  type="text"
                  placeholder="输入后回车添加"
                  :maxlength="60"
                  @keydown.enter.prevent="addTag"
                />
              </div>
              <div v-if="form.tags.length" class="tag-chip">
                <span v-for="(tag, i) in form.tags" :key="tag" class="tag-chip__item">
                  {{ tag }}
                  <button type="button" aria-label="移除标签" @click="removeTagAt(i)">×</button>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="side-panel">
          <h3 class="side-panel__title">封面</h3>
          <div class="cover-picker">
            <div class="cover-picker__preview">
              <CoverImage :path="form.cover_path" :seed="form.slug || form.title" :title="form.title" />
            </div>
            <div class="cover-picker__actions">
              <a-button size="small" :loading="uploading === 'cover'" @click="pickFile(coverInput)">
                {{ form.cover_path ? '更换封面' : '上传封面' }}
              </a-button>
              <a-button v-if="form.cover_path" size="small" danger @click="removeCover">移除</a-button>
            </div>
            <input ref="coverInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden @change="onCoverChange" />
            <p class="field__hint">支持 png / jpg / webp / gif / avif，最大 6 MB。</p>
          </div>
        </div>

        <div class="side-panel">
          <div class="attach-picker">
            <div class="attach-picker__head">
              <h3 class="side-panel__title">附件（{{ form.attachments.length }}）</h3>
              <a-button size="small" :loading="uploading === 'attach'" @click="pickFile(attachInput)">
                上传附件
              </a-button>
            </div>
            <input ref="attachInput" type="file" multiple hidden @change="onAttachChange" />
            <p v-if="!form.attachments.length" class="attach-picker__empty">还没有附件</p>
            <ul v-else class="attach-list">
              <li v-for="item in form.attachments" :key="item.path" class="attach-list__item">
                <span class="attach-list__icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <path d="M14 3v5h5" />
                    <path d="M19 8.5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4.5A1.5 1.5 0 0 1 6.5 3H14z" />
                  </svg>
                </span>
                <span>
                  <span class="attach-list__name">{{ item.name }}</span><span class="attach-list__size">{{ formatBytes(item.size) }}</span>
                </span>
                <button
                  class="attach-list__remove"
                  type="button"
                  aria-label="移除附件"
                  @click="removeAttachment(item)"
                >
                  ×
                </button>
              </li>
            </ul>
            <p class="field__hint">出于安全考虑，后端拒绝 html / svg / 可执行文件。</p>
          </div>
        </div>
      </aside>
    </PageState>
  </div>
</template>

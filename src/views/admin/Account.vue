<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { message } from 'ant-design-vue'
import { changePassword, fetchMe } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { formatDate } from '@/utils/format'

const { site } = useSiteSettings()
const store = useUserStore()
useDocumentTitle(computed(() => `账号 · ${site.value.site_name}`))

const user = computed(() => store.state.user)
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const busy = ref(false)

/** 后端只在登录后才知道用户详情，进来刷新一次，注册后立刻进来的也能拿到完整资料 */
onMounted(async () => {
  try {
    store.state.user = await fetchMe()
  } catch {
    /* 拦截器已经处理过 401，这里不用再报错 */
  }
})

const submit = async () => {
  if (form.newPassword !== form.confirm) {
    message.error('两次输入的新密码不一致')
    return
  }
  busy.value = true
  try {
    await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    message.success('密码已更新，下次登录请使用新密码')
    Object.assign(form, { oldPassword: '', newPassword: '', confirm: '' })
  } catch (e) {
    message.error(e?.message || '修改失败')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container section">
    <header class="page-head">
      <h1 class="page-head__title">账号</h1>
      <p class="page-head__sub">当前登录信息与密码修改</p>
    </header>

    <div class="account-grid">
      <div class="side-card">
        <h3 class="side-card__title">当前账号</h3>
        <div class="article__author" style="margin: 0">
          <div class="article__author-avatar">
            {{ (user?.nickname || user?.email || 'U').slice(0, 1).toUpperCase() }}
          </div>
          <div>
            <div class="article__author-name">{{ user?.nickname || '—' }}</div>
            <div class="article__author-bio">{{ user?.email }}</div>
          </div>
        </div>
        <div class="side-card__facts">
          <div class="kv"><span>角色</span><strong>{{ user?.role || 'AUTHOR' }}</strong></div>
          <div class="kv"><span>注册时间</span><strong>{{ formatDate(user?.created_at) || '—' }}</strong></div>
        </div>
        <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'Dashboard' }">回工作台</RouterLink>
      </div>

      <div class="panel-form">
        <h3 class="dashboard-section__title">修改密码</h3>
        <form class="form-grid" @submit.prevent="submit">
          <div class="field">
            <label class="field__label">当前密码 <span class="field__req">*</span></label>
            <input
              v-model="form.oldPassword"
              class="login-form__row"
              type="password"
              autocomplete="current-password"
              placeholder="现在使用的密码"
              required
            />
          </div>
          <div class="field">
            <label class="field__label">新密码 <span class="field__req">*</span></label>
            <input
              v-model="form.newPassword"
              class="login-form__row"
              type="password"
              autocomplete="new-password"
              placeholder="至少 8 位，最多 72 位"
              minlength="8"
              maxlength="72"
              required
            />
            <span class="field__hint">上限 72 位来自 BCrypt 的算法限制，更长的部分会被静默截断。</span>
          </div>
          <div class="field">
            <label class="field__label">确认新密码 <span class="field__req">*</span></label>
            <input
              v-model="form.confirm"
              class="login-form__row"
              type="password"
              autocomplete="new-password"
              placeholder="再输一次"
              required
            />
          </div>
          <div class="panel-form__actions">
            <a-button type="primary" html-type="submit" :loading="busy">更新密码</a-button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

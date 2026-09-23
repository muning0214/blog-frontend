<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  changePassword,
  fetchGithubBindUrl,
  fetchGithubEnabled,
  fetchIdentities,
  fetchMe,
  unbindGithub,
} from '@/api/auth'
import { useUserStore } from '@/store/user'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { rememberOAuthIntent } from '@/utils/oauthPending'
import { formatDate } from '@/utils/format'

const { site } = useSiteSettings()
const store = useUserStore()
useDocumentTitle(computed(() => `账号 · ${site.value.site_name}`))

const user = computed(() => store.state.user)
/** 第三方登录创建的账号没有密码，这里要显示「设置密码」而不是「修改密码」 */
const hasPassword = computed(() => user.value?.has_password !== false)

const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const busy = ref(false)

const identities = ref([])
const githubEnabled = ref(false)
const bindBusy = ref(false)

const githubIdentity = computed(() => identities.value.find((i) => i.provider === 'github'))
/** 唯一一种登录方式时禁用解绑：否则账号会变成谁也进不去的孤儿（后端也会再拦一道） */
const isLastMethod = computed(() => !hasPassword.value && identities.value.length <= 1)

const load = async () => {
  try {
    store.state.user = await fetchMe()
  } catch {
    /* 拦截器已处理 401 */
  }
  const [enabled, list] = await Promise.all([fetchGithubEnabled(), fetchIdentities()])
  githubEnabled.value = Boolean(enabled)
  identities.value = list || []
}
onMounted(load)

const submitPassword = async () => {
  if (form.newPassword !== form.confirm) {
    message.error('两次输入的新密码不一致')
    return
  }
  busy.value = true
  try {
    await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    message.success(
      hasPassword.value ? '密码已更新，下次登录请使用新密码' : '密码已设置，现在可以用邮箱密码登录了',
    )
    Object.assign(form, { oldPassword: '', newPassword: '', confirm: '' })
    await load()
  } catch (e) {
    message.error(e?.message || '操作失败')
  } finally {
    busy.value = false
  }
}

/**
 * 发起绑定。
 * 绑定走的是与登录完全相同的 GitHub 回调地址（OAuth App 只允许登记一个回调），
 * 所以把「绑定」这个意图记在 sessionStorage 里，由回调页取回来决定调哪个接口。
 */
const startBind = async () => {
  bindBusy.value = true
  try {
    const { authorizeUrl, state } = await fetchGithubBindUrl()
    rememberOAuthIntent(state, 'bind')
    window.location.href = authorizeUrl
  } catch (e) {
    message.error(e?.message || '无法发起绑定')
    bindBusy.value = false
  }
}

const confirmUnbind = () => {
  Modal.confirm({
    title: '解绑 GitHub？',
    content: '解绑后就不能再用这个 GitHub 账号登录了，随时可以重新绑定。',
    okText: '解绑',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await unbindGithub()
        message.success('已解绑')
        await load()
      } catch (e) {
        message.error(e?.message || '解绑失败')
      }
    },
  })
}
</script>

<template>
  <div class="container section">
    <header class="page-head">
      <h1 class="page-head__title">账号</h1>
      <p class="page-head__sub">登录方式与密码</p>
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
          <div class="kv"><span>密码</span><strong>{{ hasPassword ? '已设置' : '未设置' }}</strong></div>
        </div>
        <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'Dashboard' }">回工作台</RouterLink>
      </div>

      <div class="panel-form">
        <h3 class="dashboard-section__title">登录方式</h3>
        <p class="field__hint" style="margin-top: -6px">
          一个账号可以绑定多种登录方式，任意一种都能登进来。
        </p>

        <ul class="identity-list">
          <li class="identity-item">
            <span class="identity-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="M3.5 7l8.5 6 8.5-6" />
              </svg>
            </span>
            <span class="identity-item__main">
              <span class="identity-item__name">邮箱密码</span>
              <span class="identity-item__meta">{{ hasPassword ? user?.email : '未设置密码' }}</span>
            </span>
            <span class="badge" :class="hasPassword ? 'badge--ok' : 'badge--draft'">
              {{ hasPassword ? '已启用' : '未启用' }}
            </span>
          </li>

          <li class="identity-item">
            <span class="identity-item__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.56v-2.17c-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.77.42-1.28.76-1.58-2.67-.3-5.47-1.31-5.47-5.84 0-1.29.47-2.34 1.23-3.17-.12-.3-.53-1.5.12-3.12 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 6.01 0c2.29-1.53 3.3-1.21 3.3-1.21.65 1.62.24 2.82.12 3.12.77.83 1.23 1.88 1.23 3.17 0 4.54-2.81 5.53-5.49 5.82.43.37.81 1.1.81 2.22v3.29c0 .31.21.68.83.56A12.02 12.02 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z"
                />
              </svg>
            </span>
            <span class="identity-item__main">
              <span class="identity-item__name">GitHub</span>
              <span class="identity-item__meta">
                <template v-if="githubIdentity">
                  已绑定 @{{ githubIdentity.provider_username }}
                  <template v-if="githubIdentity.created_at">
                    · {{ formatDate(githubIdentity.created_at) }}
                  </template>
                </template>
                <template v-else-if="!githubEnabled">本站未配置 GitHub 登录</template>
                <template v-else>未绑定</template>
              </span>
            </span>
            <span class="identity-item__ops">
              <a-button
                v-if="!githubIdentity && githubEnabled"
                size="small"
                :loading="bindBusy"
                @click="startBind"
              >
                绑定
              </a-button>
              <a-tooltip
                v-else-if="githubIdentity"
                :title="isLastMethod ? '这是当前账号唯一的登录方式，请先设置密码再解绑' : ''"
              >
                <a-button size="small" danger :disabled="isLastMethod" @click="confirmUnbind">
                  解绑
                </a-button>
              </a-tooltip>
            </span>
          </li>
        </ul>

        <h3 class="dashboard-section__title" style="margin-top: 30px">
          {{ hasPassword ? '修改密码' : '设置密码' }}
        </h3>
        <p v-if="!hasPassword" class="field__hint" style="margin-top: -6px">
          当前账号是通过第三方登录创建的，还没有密码。设置之后就能用邮箱密码登录。
        </p>

        <form class="form-grid" @submit.prevent="submitPassword">
          <div v-if="hasPassword" class="field">
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
            <a-button type="primary" html-type="submit" :loading="busy">
              {{ hasPassword ? '更新密码' : '设置密码' }}
            </a-button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.identity-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.identity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border, #e7e9ef);
  border-radius: 10px;
  background: var(--surface-2, #fafbfd);
}
.identity-item__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e7e9ef);
  color: var(--text-2, #4c5566);
  flex-shrink: 0;
}
.identity-item__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.identity-item__name {
  font-weight: 600;
  font-size: 14px;
}
.identity-item__meta {
  font-size: 12.5px;
  color: var(--text-mute, #8b93a3);
  word-break: break-all;
}
.identity-item__ops {
  flex-shrink: 0;
}
</style>

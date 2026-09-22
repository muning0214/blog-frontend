<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store/user'
import { useSiteSettings } from '@/composables/useSiteSettings'
import { useDocumentTitle } from '@/composables/useDocumentTitle'

const route = useRoute()
const router = useRouter()
const store = useUserStore()
const { site } = useSiteSettings()

useDocumentTitle(computed(() => `登录 · ${site.value.site_name}`))

const tab = ref('login')
const form = ref({ email: '', password: '', confirm: '', nickname: '' })
const busy = ref(false)
const error = ref('')
const ok = ref('')

const redirectTo = computed(() => String(route.query.redirect || '/admin/dashboard'))

onMounted(() => {
  if (store.state.unavailable) {
    error.value = '连不上后端服务：请先在 blog-backend 目录执行 mvn spring-boot:run（默认 8080 端口），然后刷新本页。'
  }
})

const switchTab = (next) => {
  tab.value = next
  form.value.password = ''
  form.value.confirm = ''
  error.value = ''
  ok.value = ''
}

const submit = async () => {
  error.value = ''
  ok.value = ''
  busy.value = true
  try {
    if (tab.value === 'login') {
      const data = await store.login({ email: form.value.email.trim(), password: form.value.password })
      message.success(`欢迎回来，${data.user?.nickname || '作者'}`)
    } else {
      if (form.value.password !== form.value.confirm) {
        error.value = '两次输入的密码不一致'
        return
      }
      const data = await store.register({
        email: form.value.email.trim(),
        password: form.value.password,
        nickname: form.value.nickname.trim() || undefined,
      })
      message.success('注册成功，已自动登录')
    }
    // 只在这里跳一次。不要再用 watch 去观察登录态：登录失败的 401 也会触发它，
    // 加上守卫的重定向，会出现「登录成功却跳回登录页」的套娃
    await router.push(redirectTo.value)
  } catch (e) {
    error.value = e?.message || '操作失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container section login-page">
    <div class="login-card">
      <div class="login-card__head">
        <span class="hero__eyebrow">作者入口</span>
        <h1>登录 {{ site.site_name }}</h1>
        <p class="login-card__sub">
          登录后可以写作、上传图片与附件、管理标签和站点信息。访客浏览文章不需要登录。
        </p>
      </div>

      <div class="tabs" role="tablist">
        <button
          class="tabs__item"
          :class="{ 'is-active': tab === 'login' }"
          type="button"
          role="tab"
          :aria-selected="tab === 'login'"
          @click="switchTab('login')"
        >
          密码登录
        </button>
        <button
          class="tabs__item"
          :class="{ 'is-active': tab === 'register' }"
          type="button"
          role="tab"
          :aria-selected="tab === 'register'"
          @click="switchTab('register')"
        >
          注册账号
        </button>
      </div>

      <p v-if="error" class="notice notice--error">{{ error }}</p>
      <p v-if="ok" class="notice notice--ok">{{ ok }}</p>

      <a-form class="login-form" layout="vertical" :model="form" @finish="submit">
        <a-form-item
          label="邮箱"
          name="email"
          :rules="[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]"
        >
          <a-input
            v-model:value="form.email"
            type="email"
            placeholder="admin@devlog.local"
            autocomplete="username"
          />
        </a-form-item>

        <a-form-item
          v-if="tab === 'register'"
          label="昵称"
          name="nickname"
          extra="留空则取邮箱 @ 前面的部分"
        >
          <a-input v-model:value="form.nickname" placeholder="显示名" :maxlength="60" />
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码至少 8 位' },
          ]"
          :extra="tab === 'register' ? '8 到 72 位，上限来自 BCrypt 的算法限制' : undefined"
        >
          <a-input-password
            v-model:value="form.password"
            placeholder="••••••••"
            :autocomplete="tab === 'login' ? 'current-password' : 'new-password'"
          />
        </a-form-item>

        <a-form-item
          v-if="tab === 'register'"
          label="确认密码"
          name="confirm"
          :rules="[{ required: true, message: '请再输一次密码' }]"
        >
          <a-input-password v-model:value="form.confirm" placeholder="再输一次" autocomplete="new-password" />
        </a-form-item>

        <a-button type="primary" html-type="submit" size="large" block :loading="busy">
          {{ tab === 'login' ? '登录' : '注册并登录' }}
        </a-button>
      </a-form>

      <div class="login-card__foot">
        <span class="login-card__note">
          登录态存在浏览器本地，令牌过期会自动跳回本页
        </span>
        <RouterLink class="link-inline" :to="{ name: 'Home' }">先去逛逛文章</RouterLink>
      </div>
    </div>

    <aside class="login-aside">
      <h2>这个站点怎么搭的</h2>
      <p>三个模块各自独立，前端不碰数据库，后端不管界面：</p>
      <ul>
        <li><strong>blog-frontend</strong> —— Vue 3 + Vite + Ant Design Vue</li>
        <li><strong>blog-backend</strong> —— Spring Boot 3.2 + MyBatis-Plus</li>
        <li><strong>blog-database</strong> —— MySQL 8 的表结构与初始数据</li>
      </ul>
      <p>
        初始账号是 <code>admin@devlog.local</code>，密码 <code>admin123</code>，
        由 <code>blog-database/02_seed.sql</code> 灌入。
      </p>
      <p class="login-aside__note">
        这个默认密码只是为了让本地第一次就能登进来，换成真实环境请立刻改掉。
      </p>
    </aside>
  </div>
</template>

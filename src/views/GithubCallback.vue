<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bindGithub } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { takeOAuthIntent } from '@/utils/oauthPending'

/**
 * GitHub 授权回调页。
 *
 * GitHub 会带着 ?code=&state= 跳到这里（不带 code 时说明用户点了取消）。
 * 本页只做一件事：把 code 交给后端换取令牌，然后按原意图去该去的地方。
 *
 * 之所以回调到这里而不是后端接口：令牌通过**响应体**返回，不落在跳转 URL 上。
 * URL 会进浏览器历史、Referer 和各级访问日志，把长期令牌拼进去等于到处留副本。
 */
const route = useRoute()
const router = useRouter()
const store = useUserStore()

const status = ref('pending')
const message = ref('')
/** 成功后要去哪：绑定流程去账号页，登录流程去工作台 */
const afterRoute = ref({ name: 'Dashboard' })

onMounted(async () => {
  const code = route.query.code
  const oauthState = route.query.state
  const error = route.query.error
  const errorDesc = route.query.error_description

  if (error) {
    status.value = 'failed'
    message.value =
      String(error) === 'access_denied'
        ? '你取消了 GitHub 授权。'
        : `GitHub 返回了错误：${errorDesc || error}`
    return
  }
  if (!code || !oauthState) {
    status.value = 'failed'
    message.value = '回调参数不完整（缺少 code 或 state），无法完成授权。'
    return
  }

  const intent = takeOAuthIntent(String(oauthState))
  try {
    if (intent.mode === 'bind') {
      await bindGithub(String(code), String(oauthState))
      afterRoute.value = { name: 'Account' }
      status.value = 'done'
      message.value = 'GitHub 账号已绑定到当前账号。'
    } else {
      const data = await store.loginWithGithub(String(code), String(oauthState))
      afterRoute.value = { path: intent.redirect }
      status.value = 'done'
      message.value = `欢迎回来，${data.user?.nickname || '作者'}。正在进入工作台…`
    }
    window.setTimeout(() => router.replace(afterRoute.value), 900)
  } catch (e) {
    status.value = 'failed'
    message.value = e?.message || '授权失败，请重试。'
  }
})
</script>

<template>
  <div class="container section login-page">
    <div class="login-card login-card--loading">
      <div v-if="status === 'pending'" class="oauth-callback__pending">
        <a-spin size="large" />
        <p class="state-block__desc">正在与 GitHub 确认身份…</p>
      </div>

      <a-result
        v-else
        :status="status === 'done' ? 'success' : 'error'"
        :title="status === 'done' ? '完成' : '没能完成'"
        :sub-title="message"
      >
        <template #extra>
          <a-button
            v-if="status === 'failed'"
            type="primary"
            @click="router.replace({ name: 'Login' })"
          >
            返回登录
          </a-button>
          <a-button v-else type="primary" @click="router.replace(afterRoute)">继续</a-button>
        </template>
      </a-result>
    </div>
  </div>
</template>

<style scoped>
.oauth-callback__pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 48px 0;
}
</style>

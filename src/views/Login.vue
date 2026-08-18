<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>后台管理登录</h1>
        <p>Personal Blog Admin System</p>
      </div>
      <a-form
        :model="loginForm"
        @finish="handleLogin"
        layout="vertical"
        class="login-form"
      >
        <a-form-item
          name="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input
            v-model:value="loginForm.username"
            size="large"
            placeholder="用户名"
          >
            <template #prefix><user-outlined /></template>
          </a-input>
        </a-form-item>

        <a-form-item
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="loginForm.password"
            size="large"
            placeholder="密码"
            @pressEnter="handleLogin"
          >
            <template #prefix><lock-outlined /></template>
          </a-input-password>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            登录
          </a-button>
        </a-form-item>

        <div class="login-tip">
          <p>默认账号：admin</p>
          <p>默认密码：admin123</p>
        </div>
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store/user'

const router = useRouter()
const route = useRoute()
const { login } = useUserStore()

const loading = ref(false)
const loginForm = ref({
  username: 'admin',
  password: 'admin123'
})

async function handleLogin() {
  loading.value = true
  try {
    await login(loginForm.value)
    message.success('登录成功')
    const redirect = route.query.redirect || '/admin/dashboard'
    router.push(redirect)
  } catch (e) {
    // Error already handled by interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.login-header p {
  color: #999;
  font-size: 13px;
}

.login-tip {
  text-align: center;
  margin-top: 16px;
  padding: 12px;
  background: #f6f8fa;
  border-radius: 6px;
}

.login-tip p {
  font-size: 13px;
  color: #666;
  margin: 4px 0;
}
</style>

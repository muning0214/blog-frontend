<template>
  <div class="about-page">
    <a-card>
      <h2 class="page-title">关于我</h2>
      <div class="about-content">
        <div class="avatar-section">
          <a-avatar :size="100" style="background-color: #1677ff; font-size: 36px;">B</a-avatar>
        </div>

        <div class="info-section">
          <h3>👋 你好，欢迎来到我的博客！</h3>
          <p>
            我是一名全栈开发者，热爱技术、热爱生活。这个博客是我用来记录技术成长、分享生活感悟的地方。
          </p>

          <a-divider />

          <h3>🛠 技术栈</h3>
          <div class="tech-tags">
            <a-tag color="green">Java</a-tag>
            <a-tag color="green">Spring Boot</a-tag>
            <a-tag color="green">MyBatis-Plus</a-tag>
            <a-tag color="blue">Vue 3</a-tag>
            <a-tag color="blue">TypeScript</a-tag>
            <a-tag color="blue">Vite</a-tag>
            <a-tag color="cyan">MySQL</a-tag>
            <a-tag color="cyan">Redis</a-tag>
            <a-tag color="orange">Docker</a-tag>
            <a-tag color="orange">Nginx</a-tag>
          </div>

          <a-divider />

          <h3>📚 博客说明</h3>
          <p>本博客系统采用前后端分离架构开发：</p>
          <ul>
            <li>后端：Spring Boot 3 + JDK 17 + MyBatis-Plus + MySQL 8 + JWT</li>
            <li>前端：Vue 3 + Vite + Ant Design Vue + Axios + Vue Router</li>
          </ul>

          <a-divider />

          <h3>📬 联系方式</h3>
          <p>📧 Email: admin@blog.com</p>
          <p>🐙 GitHub: https://github.com/my-blog</p>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup>
</script>

<style scoped>
.page-title {
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 24px;
}

.about-content {
  max-width: 700px;
  margin: 0 auto;
}

.avatar-section {
  text-align: center;
  margin-bottom: 24px;
}

.info-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.info-section p {
  color: #555;
  line-height: 1.8;
  margin-bottom: 12px;
}

.info-section ul {
  padding-left: 24px;
  color: #555;
  line-height: 2;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .about-content {
    padding: 0 8px;
  }
}
</style>

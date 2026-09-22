import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * 开发期 dev server 固定在 5173，并把 /api 与 /uploads 代理到后端 8080。
 * 生产环境是把 dist/ 交给 Nginx，由它把这两个前缀反向代理到后端 ——
 * 两边都是「同源 + 相对路径」，所以前端代码里不需要任何环境相关的接口地址。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 图片与附件由后端的静态资源映射提供。不代理的话前端会去 5173 找，直接 404。
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  },
})

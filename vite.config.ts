import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * 开发期 dev server 固定在 5173，并把 /api 与 /uploads 代理到后端 8080。
 * 生产环境是把 dist/ 交给 Nginx，由它把 /api 与 /uploads 反向代理到后端 ——
 * 两边都是「同源 + 相对路径」，所以前端代码里不需要任何环境相关的接口地址。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  },
})

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 开发态：前端跑在 5173，通过 /api 代理到网关 8080（避免跨域——网关没配 CORS，直连会被预检拦掉）。
// 生产态：由 nginx 反代 /api 到网关，或把 VITE_API_BASE 指向网关地址。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        // 本地起了两套网关、或者网关换了端口时，配 .env 就行，不用动代码
        '/api': {
          target: env.VITE_GATEWAY || 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          // 用函数式而不是 { 'element-plus': ['element-plus'] } 对象式：本端是 app.use(ElementPlus) 全量引入，
          // 体积几乎都在 element-plus/es/** 的内部模块里，对象式只命中入口那一个模块，内部依赖还是会散回主 chunk。
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('element-plus') || id.includes('@element-plus')) return 'element-plus'
            // hls.js 只被详情页的播放器用到，单独一块，别的页面不必下载
            if (id.includes('hls.js')) return 'hls'
            return 'vendor'
          }
        }
      }
    }
  }
})

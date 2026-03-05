/*
 * @Author: dys
 * @Date: 2025-12-09 09:31:51
 * @LastEditors: dys
 * @LastEditTime: 2026-03-03 16:56:00
 * @Descripttion:
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: env.VITE_APP_BASE,
    server: {
      open: false,
      port: parseInt(env.VITE_APP_PORT),
      proxy: {
        [env.VITE_BASE_URL]: {
          target: env.VITE_APP_SERVER_PATH,
          changeOrigin: true /* 允许跨域 */,
          rewrite: (path) => path.replace(new RegExp(`^${env.VITE_BASE_URL}`), ''),
        },
      },
    },
    plugins: [vue(), vueDevTools(), cesium()],
    build: {
      // 让 Cesium 的资源路径正确构建
      assetsInlineLimit: 0,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})

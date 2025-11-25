import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 防止 Vite 在开发时清空控制台
  clearScreen: false,
  
  // Tauri 在开发时使用固定端口
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 忽略监听 src-tauri 目录
      ignored: ['**/src-tauri/**'],
    },
  },
  
  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
  
  // 环境变量前缀
  envPrefix: ['VITE_', 'TAURI_'],
  
  build: {
    // Tauri 使用 Chromium 在 Windows 上，目标可以更具体
    target: process.env.TAURI_PLATFORM === 'windows' 
      ? 'chrome105' 
      : 'safari13',
    // 不压缩在开发时调试
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // 生产环境生成 sourcemap 便于调试
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})

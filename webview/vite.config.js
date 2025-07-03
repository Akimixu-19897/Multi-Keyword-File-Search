import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../webview-dist',
    rollupOptions: {
      output: {
        entryFileNames: 'search-panel.js',
        chunkFileNames: 'search-panel.js',
        assetFileNames: 'search-panel.[ext]'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})

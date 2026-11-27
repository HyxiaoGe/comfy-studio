import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../web/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8899',
      '/results': 'http://127.0.0.1:8899',
      '/composed': 'http://127.0.0.1:8899',
      '/tts': 'http://127.0.0.1:8899',
      '/audio': 'http://127.0.0.1:8899',
    },
  },
})

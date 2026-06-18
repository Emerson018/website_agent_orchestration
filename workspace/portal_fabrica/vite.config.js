import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api-lm': {
        target: 'http://localhost:1234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-lm/, ''),
      },
    },
  },
})

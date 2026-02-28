import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Stable vendor chunks — cached by browser across deploys
          'react-vendor': ['react', 'react-dom'],
          'pusher':        ['pusher-js'],
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000, // Keep it consistent for your CORS settings
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Points to your K3s NodePort
        changeOrigin: true,
      }
    }
  }
})
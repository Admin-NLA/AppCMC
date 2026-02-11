import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ include: /\.(js|jsx)$/ })],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://cmc-app.onrender.com/api'),
    'import.meta.env.VITE_NOTIF_URL': JSON.stringify(process.env.VITE_NOTIF_URL || 'https://cmc-app.onrender.com/events'),
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
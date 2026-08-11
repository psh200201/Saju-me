import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Static files (favicon, icons) live at project root instead of /public
  publicDir: false,
})

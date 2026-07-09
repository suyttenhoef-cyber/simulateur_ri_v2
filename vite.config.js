import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/simulateur_ri_v2/', // Nécessaire pour GitHub Pages
  test: {
    environment: 'node',
    globals: true,
  },
})

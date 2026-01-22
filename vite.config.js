
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // IMPORTANT : nom EXACT du repo GitHub Pages
  base: '/simulateur_ri_v2/', 
})
``

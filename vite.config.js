import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Chemins relatifs — déployable depuis n'importe quel sous-dossier
  test: {
    environment: 'node',
    globals: true,
  },
})

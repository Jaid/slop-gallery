import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {target: 'chrome152', outDir: 'dist', sourcemap: true, chunkSizeWarningLimit: 6000},
  server: {host: '127.0.0.1'}
})
